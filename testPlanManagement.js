const axios = require('axios');
const moment = require('moment');
const fs = require('fs');
const { stringify } = require('querystring');

let testPlanId = null;
let jsonString = [];
let APIToken = "";
let projectId = 0;
let tagId = 0;
let assigneeId = 0;

if (process.argv.length === 2) {
    console.error("No arguments passed");
    return process.exit(1);
}

process.argv.forEach(function (val, index, array) {
    try {
        if (val.toLowerCase().startsWith("--apitoken")) {
            APIToken = val.substring(val.indexOf("=") + 1);
            if (APIToken.length != 16) {
                console.error("Invalid value for APIToken")
                return process.exit(1);
            }
        }
        if (val.toLowerCase().startsWith("--projectid")) {
            projectId = val.substring(val.indexOf("=") + 1)
            if (projectId.length == 0 || projectId * 1 != projectId) {
                console.error("Invalid value for projectId");
                return process.exit(1);
            }
        }
        if (val.toLowerCase().startsWith("--tagid")) {
            tagId = val.substring(val.indexOf("=") + 1)
            if (tagId.length == 0 || tagId * 1 != tagId) {
                console.error("Invalid value for tagId");
                return process.exit(1);
            }
        }
        if (val.toLowerCase().startsWith("--assigneeid")) {
            assigneeId = val.substring(val.indexOf("=") + 1)
            if (assigneeId.length == 0 || assigneeId * 1 != assigneeId) {
                console.error("Invalid value for assigneeId");
                return process.exit(1);
            }
        }
    }
    catch (err) {
        console.error("Error while parsing command line arguments");
        return process.exit(1);
    }
});
addTestPlan(APIToken, projectId, tagId, assigneeId);

async function addTestPlan(APIToken, projectId, tagId, assigneeId) {
    try {
        await axios.post("https://api.testcollab.io/testplans?token=" + APIToken, {
            "archived": false,
            "title": "Test plan using API " + moment().format('YYYY-MM-DD:hh:mm:ss'),
            "priority": "1",
            "status": 0,
            "test_plan_folder": null,
            "description": "",
            "start_date": null,
            "end_date": null,
            "project": projectId,
            "custom_fields": [
                {
                    "name": "0",
                    "id": 0,
                    "value": "0"
                }
            ]
        }).then(async (postTPAddResponse) => {
            try {
                jsonString = JSON.stringify(postTPAddResponse.data);
                const TPData = JSON.parse(jsonString);
                if (TPData != null && TPData.id != null) {
                    testPlanId = TPData.id;
                    await axios.post("https://api.testcollab.io/testplantestcases/bulkAdd?token=" + APIToken, {
                        "testplan": testPlanId,
                        "testCaseCollection": {
                            "testCases": [],
                            "selector": [
                                {
                                    "field": "advancedFilters",
                                    "operator": "jsonstring_2",
                                    "value": "{\"filterType\":\"text\",\"type\":\"contains\",\"filter\":\"{\\\"sqlQuery\\\":\\\"tags = '" + tagId + "'\\\",\\\"jsonTree\\\":{\\\"id\\\":\\\"8b89b899-0123-4456-b89a-b18a73669bca\\\",\\\"type\\\":\\\"group\\\",\\\"children1\\\":{\\\"88aba9a9-cdef-4012-b456-718a7366dd7f\\\":{\\\"type\\\":\\\"rule\\\",\\\"properties\\\":{\\\"field\\\":\\\"tags\\\",\\\"operator\\\":\\\"multiselect_equals\\\",\\\"value\\\":[[" + tagId + "]],\\\"valueSrc\\\":[\\\"value\\\"],\\\"valueType\\\":[\\\"multiselect\\\"]}}}},\\\"simpleFilters\\\":{\\\"tags\\\":{\\\"filter\\\":[[" + tagId + "]],\\\"type\\\":\\\"equals\\\",\\\"filterType\\\":\\\"number\\\"}}}\"}"
                                },
                                {
                                    "field": "tags",
                                    "operator": "jsonstring_2",
                                    "value": "{\"filter\":[[" + tagId + "]],\"type\":\"equals\",\"filterType\":\"number\"}"
                                }
                            ]
                        }
                    }).then(async (postBulkAddResponse) => {
                        try {
                            jsonString = JSON.stringify(postBulkAddResponse.data);
                            const bulkAddData = JSON.parse(jsonString);
                            if (bulkAddData.status != null && bulkAddData.status == true) {
                                await axios.post("https://api.testcollab.io/testplans/assign?project=" + projectId + "&token=" + APIToken, {
                                    "assignment_criteria": "testCase",
                                    "assignment_method": "automatic",
                                    "assignment": {
                                        "user": [
                                            assigneeId
                                        ],
                                        "testCases": {
                                            "testCases": [],
                                            "selector": []
                                        },
                                        "configuration": null
                                    },
                                    "testplan": testPlanId
                                }).then(async (postAssignTPResponse) => {
                                    try {
                                        jsonString = JSON.stringify(postAssignTPResponse.data);
                                        const assignTPData = JSON.parse(jsonString);
                                        if (assignTPData.status != null && assignTPData.status == true) {              fs.writeFileSync('testplanId.txt',testPlanId.toString())                            
                                            return process.exit(0);
                                        }
                                        else {
                                            console.error("Error with status of assign");
                                            return process.exit(1);
                                        }
                                    } catch (err) {
                                        console.error('Error while processing assign response: ', err);
                                        return process.exit(1);
                                    }
                                }).catch((err) => {
                                    console.error("Error while making assign API call: " + err);
                                    return process.exit(1);
                                });
                            }
                            else {
                                console.error("Error with status of bulk add");
                                return process.exit(1);
                            }
                        }
                        catch (err) {
                            console.error('Error while processing bulk add response: ', err);
                            return process.exit(1);
                        }
                    }).catch((err) => {
                        console.error("Error while making bulk add API call " + err);
                        return process.exit(1);
                    });
                }
                else {
                    console.error("Test plan id could not be fetched");
                    return process.exit(1);
                }
            } catch (err) {
                console.error('Error after processing add test plan response: ', err);
                return process.exit(1);
            }
        }).catch((err) => {
            console.error("Error while making add test plan API call " + err);
            return process.exit(1);
        });
    }
    catch (err) {
        console.error("Error while adding test plan " + err);
        return process.exit(1);
    }
}
