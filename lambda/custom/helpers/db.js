let AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const tableName = "seasonalVegetables";

let db = function () { };
let docClient = new AWS.DynamoDB.DocumentClient();

db.prototype.getCurrent = (monthSlotValue,typeToQuery,seasonSlotValue) => {
    let params = getParams(monthSlotValue,typeToQuery,seasonSlotValue);
    return new Promise((resolve, reject) => {
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
        })
    });
}

db.prototype.getByNameSeason = (vegetablesName) => {
    let capitalVegeName = capitalizeFirstLetter(vegetablesName);
    console.log(capitalVegeName);
    let params = getNameParams(capitalVegeName);
    return new Promise((resolve, reject) => {
        docClient.query(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
        })
    });
}

// db.prototype.getByNameMonth = (vegetablesName) => {
//     let capitalVegeName = capitalizeFirstLetter(vegetablesName);
//     console.log(capitalVegeName);
//     let params = getNameParams(capitalVegeName);
//     return new Promise((resolve, reject) => {
//         docClient.query(params, (err, data) => {
//             if (err) {
//                 console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
//                 return reject(JSON.stringify(err, null, 2))
//             } 
//             console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
//             resolve(data.Items)
//         })
//     });
// }

function getNameParams(queryString) {
    let params = {
        TableName : tableName,
        KeyConditionExpression: "#name = :id",
        ExpressionAttributeNames:{
            "#name": "userId"
        },
        ExpressionAttributeValues: {
            ":id": queryString
        }
    };
    return params
}

//Helper Functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function getCurrentMonth() {
    const d = new Date();
    let m =  monthNames[d.getMonth()];
    return m;
}

function getParams(monthToValue, typeToValue, seasonToValue) { 
    let paramAttributes = {};
    let filterExp = '';

    //if only month slot is included
    if (!typeToValue && !seasonToValue && monthToValue) {
        let monthToQuery = monthToValue.toLowerCase();
        paramAttributes = { ':topic': monthToQuery };
        filterExp = "contains (#month, :topic)";
    }
    //if only season slot is inlcuded
    else if (!typeToValue && !monthToValue && seasonToValue){
        let seasonToQuery = seasonToValue.toLowerCase();
        paramAttributes = { ':topic': seasonToQuery };
        filterExp = "contains (#season, :topic)";
    }
    //if type and month slot are included
    else if (!seasonToValue && typeToValue && monthToValue){
        let monthToQuery = monthToValue.toLowerCase(); 
        paramAttributes = { ':topic': monthToQuery, ':bit' : typeToValue };
        filterExp = "contains (#type, :bit) AND contains (#month, :topic)";
    //if type and season slot are included
    } else if (!monthToValue && seasonToValue && typeToValue) {
        let seasonToQuery = seasonToValue.toLowerCase();
        paramAttributes = { ':topic': seasonToQuery, ':bit' : typeToValue };
        filterExp = "contains (#type, :bit) AND contains (#season, :topic)";
    //if no slots are included
    } else {
        let monthToQuery = getCurrentMonth();
        paramAttributes = { ':topic': monthToQuery };
        filterExp = "contains (#month, :topic)";
    }

    var params = {
        TableName : tableName,
        ProjectionExpression:"#month, #name, #type, #season",
        ExpressionAttributeNames:{
            "#month": "month",
            "#name": "userId",
            "#type": "type",
            "#season": "season"
        },
        FilterExpression: filterExp ,
        ExpressionAttributeValues : paramAttributes
    };
    return params;
}

module.exports = new db();