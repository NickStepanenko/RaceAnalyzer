/**
 * Created by admin on 10.09.2015.
 */

var fs = require('fs');
var async = require('async');

var xmlData = fs.readFileSync('data.xml').toString();
var entryList = xmlData.split('<Driver>');

function getTagContent (data, str) {
    var beginTag = "<"+str+">";
    var endTag = "</"+str+">"
    var content = "";

    if(data.indexOf(beginTag)!=-1) {
        content = data.slice(
            data.indexOf(beginTag)+beginTag.length,
            data.indexOf(endTag)
        );
    } else {
        content = "Can not find content tag."
    }

    return content;
}

function lapsAnalyzer (str) {
    var lap = {};
    var laps = [];

    var data = str.split("<Lap ").slice(1);
    data[data.length-1] = data[data.length-1].slice(0, data[data.length-1].indexOf("</Lap>")+6);

    for(i=0; i<data.length; i++) {
        var currentData = data[i].split(" ");

        lap.num = currentData[0].slice(5, currentData[0].length-1);
        //console.log(currentData[2].slice(4, currentData[2].length-1));
        lap.estimatedTime = currentData[2].slice(4, currentData[2].length-1);

        for(j=0; j<currentData.length; j++) {
            if(currentData[j].indexOf("s1") != -1) {
                lap.s1 = currentData[j].slice(4, currentData[j].length-1);
            }
            if(currentData[j].indexOf("s2") != -1) {
                lap.s2 = currentData[j].slice(4, currentData[j].length-1);
            }
            if(currentData[j].indexOf("s3") != -1) {
                lap.s3 = currentData[j].slice(4, currentData[j].length-1);
            }
            if(currentData[j].indexOf("fuel") != -1) {
                lap.fuel = currentData[j].slice(6, 11);
            }
            if(currentData[j].indexOf("pit") != -1) {
                lap.pit = "1";
            }
        }

        lap.lapTime =
            currentData[currentData.length-1].slice(
                currentData[currentData.length-1].indexOf(">")+1,
                currentData[currentData.length-1].indexOf("<")
            );

        laps.push(lap);
        lap = {};
    }

    return laps;
}

async.waterfall([
    function getDriversData(callback) {
        var raceInfo = {};
        raceInfo.drivers = [];
        var classes = [];

        for(i=0; i<entryList.length; i++) {
            if(i==0) {
                raceInfo.setting = getTagContent(entryList[i], "Setting");
                raceInfo.serverName = getTagContent(entryList[i], "ServerName");
                raceInfo.eventName = getTagContent(entryList[i], "TrackEvent");
                raceInfo.trackName = getTagContent(entryList[i], "TrackCourse");
                raceInfo.raceLaps = (getTagContent(entryList[i], "RaceLaps") == "0" ? "no limit" : getTagContent(entryList[i], "RaceLaps"));
                raceInfo.raceTime = (getTagContent(entryList[i], "RaceTime") == "0" ? "no limit" : getTagContent(entryList[i], "RaceTime"));
                raceInfo.fuelMult = getTagContent(entryList[i], "FuelMult");
                raceInfo.tireMult = getTagContent(entryList[i], "TireMult");
                raceInfo.isRaceCompleted =
                    (getTagContent(entryList[i], "MostLapsCompleted") == raceInfo.raceLaps ? "Race Completed" : "Race Interrupted");
            } else {
                var driver = {};
                driver.lapByLap = [];

                driver.name = getTagContent(entryList[i], "Name");
                driver.carNumber = getTagContent(entryList[i], "CarNumber");

                var teamName =
                    getTagContent(entryList[i], "VehFile").slice(0, getTagContent(entryList[i], "VehFile").indexOf("_"));
                var carClass = getTagContent(entryList[i], "CarClass");

                if(carClass == "SuperSoft" ||
                    carClass == "Soft" ||
                    carClass == "Medium" ||
                    carClass == "Hard" ||
                    carClass == "Intermediate" ||
                    carClass == "Wet") {
                    driver.carClass = "F1";
                } else {
                    driver.carClass = carClass;
                }

                if(classes.indexOf(driver.carClass) == -1) {
                    classes.push(driver.carClass);
                }

                switch(teamName) {
                    case "FERRARI":
                        driver.teamName = "Ferrari";
                        break;
                    case "FORCEINDIA":
                        driver.teamName = "Force India Mercedes";
                        break;
                    case "LOTUS":
                        driver.teamName = "Lotus Mercedes";
                        break;
                    case "MANOR":
                        driver.teamName = "Marussia Ferrari";
                        break;
                    case "MCLAREN":
                        driver.teamName = "McLaren Honda";
                        break;
                    case "MERCEDES":
                        driver.teamName = "Mercedes";
                        break;
                    case "REDBULL":
                        driver.teamName = "Red Bull Racing Renault";
                        break;
                    case "SAUBER":
                        driver.teamName = "Sauber Ferrari";
                        break;
                    case "TOROROSSO":
                        driver.teamName = "Toro Rosso Renault";
                        break;
                    case "WILLIAMS":
                        driver.teamName = "Williams Mercedes";
                        break;

                    default: driver.teamName = "Unknown Team";
                }

                driver.isPlayer = getTagContent(entryList[i], "isPlayer");
                driver.gridPosition = getTagContent(entryList[i], "GridPos");
                driver.finishPosition = getTagContent(entryList[i], "Position");
                driver.earnedPoints = getTagContent(entryList[i], "Points");
                driver.bestLapTime = getTagContent(entryList[i], "BestLapTime");
                driver.finishTime = getTagContent(entryList[i], "FinishTime");
                driver.completedLaps = getTagContent(entryList[i], "Laps");
                driver.numOfPitstops = getTagContent(entryList[i], "Pitstops");

                var finishStatus = getTagContent(entryList[i], "FinishStatus");

                if(finishStatus == "DNF") {
                    driver.finishStatus = "DNF";
                    driver.DNFReason = getTagContent(entryList[i], "DNFReason");
                } else {
                    driver.finishStatus = finishStatus;
                }

                raceInfo.classes = classes;

                raceInfo.drivers.push(driver);
            }
        }

        callback(null, raceInfo);
    },
    function getLapByLapData(driversData, callback) {
        for(k=1; k<entryList.length; k++) {
            if(driversData.drivers[k-1].name == "Konstantinos Manolis") {
                var flag = "here";
            }
            driversData.drivers[k-1].lapByLap = lapsAnalyzer(entryList[k]);
        }

        callback(null, driversData);
    }
], function (err, driversData) {
    fs.writeFileSync("race.data", "var raceInfo = " + JSON.stringify(driversData, null, "\t"));
});