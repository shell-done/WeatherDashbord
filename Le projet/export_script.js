compt = 1;
function displayNav() {
	$('nav').toggle();
	if(compt%2 == 0)
		$('.bloc').css('margin-left','85px');
	else
		$('.bloc').css('margin-left','10px');

	compt++;
}

function generateJSONData(minT, maxT, minH, maxH, cpt) {
  var date = new Date()
  var data = {
    "id": "D"+(cpt+1),
    "date": date,
    "temperature": {
      "avg": Math.random()*(maxT-minT)+minT,
      "min": Math.random()*(maxT-minT)+minT,
      "max": Math.random()*(maxT-minT)+minT,
      "stddev": Math.random()*30,
      "current": Math.random()*(maxT-minT)+minT
    },
    "humidity": {
      "avg": Math.random()*(maxH-minH)+minH,
      "min": Math.random()*(maxH-minH)+minH,
      "max": Math.random()*(maxH-minH)+minH,
      "stddev": Math.random()*30,
      "current": Math.random()*(maxH-minH)+minH
    }
  }

  return JSON.stringify(data)
}

generateData = true
function autoGenerateData() {
  for(j=0; j<numberOfSensor; j++) {
    data = generateJSONData(0, 50, 0, 100, j)
    if(storeData(data))
      main();
  }
}

//Global var
thermometerImg = null
hygrometerImg = null
sensorsData = []
numberOfSensor = 7
tempChart = null
humChart = null

firstDate = null
lastDate = null
tempHum = [true, true]
displaySensors = [true, true, true, true, true, true, true]
function loadWebpageData() {
  thermometerImg = new Image()
  thermometerImg.src = "../icons/thermometer_empty.png"
  hygrometerImg = new Image()
  hygrometerImg.src = "../icons/hygrometer_empty.png"

  $(".warning1").hide();
  $(".warning2").hide();

	now = new Date()
	yest = new Date()
	//yest.setDate(now.getDate() - 1)

	$("#erreurs, #graphs, #données").hide();
	$("input[name=time_start]").attr("value", yest.getFullYear()+"-"+("0"+(yest.getMonth()+1)).slice(-2)+"-"+("0" +yest.getDate()).slice(-2)+"T"+("0"+yest.getHours()).slice(-2)+":"+("0"+yest.getMinutes()).slice(-2))
	$("input[name=time_end]").attr("value", now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2)+"-"+("0" + now.getDate()).slice(-2)+"T"+("0"+now.getHours()).slice(-2)+":"+("0"+now.getMinutes()).slice(-2))

  for(i=0; i<numberOfSensor; i++)
    sensorsData.push([])

  if(generateData) {
    autoGenerateData();
    setInterval(autoGenerateData, 1000);
    return;
  }

  getDataFromDatabase(0)

  ws = new WebSocket('ws://51.38.239.114:8080');
  ws.onopen = function () {console.log('Connected to the broker');};
  ws.onmessage = function (evt) {
    if(storeData(evt.data))
      main();
  };
  ws.onclose = function () {console.log('Socket closed');};
}

function main() { 
	setValue()

	if(tempChart) {
		for(i=0; i<numberOfSensor; i++) {
			if(!sensorsData[i][0])
				continue;

			if(tempChart.series[i].data[0] != (Date.parse(sensorsData[i][0])+7200000)) {
				tempChart.series[i].addPoint([Date.parse(sensorsData[i][0].date)+7200000, sensorsData[i][0].temperature.current], true, tempChart.series[i].data.length >= 20)
				humChart.series[i].addPoint([Date.parse(sensorsData[i][0].date)+7200000, sensorsData[i][0].humidity.current], true, humChart.series[0].data.length >= 20)
			}
		}
	} else {
		initializeCharts()
	}
}

function setValue() {
	tempHum[0] = $("input[name=Température]").is(":checked")
	tempHum[1] = $("input[name=Humidité]").is(":checked")
	for(i=0; i<numberOfSensor; i++)
		displaySensors[i] = $("input[name="+(i+1)+"]").is(":checked")

	startDate = new Date($("input[name=time_start]").val());
	endDate = new Date($("input[name=time_end]").val());

  dataAvailable = false;
  for(i=0; i<numberOfSensor; i++) {
    if(displaySensors[i] && sensorsData[i])
			for(j=0; j<sensorsData[i].length; j++) {
      	if(Date.parse(startDate) < Date.parse(sensorsData[i][j].date) && Date.parse(endDate) > Date.parse(sensorsData[i][j].date)) {
        	dataAvailable = true;
        	break;
				}
      }
  }

  if(!dataAvailable) {
    $("#erreurs").show();
    $("#graphs, #données").hide();
  } else {
    $("#erreurs").hide();
		$("#graphs, #données").show();

		if(tempChart) {
			for(i=0; i<numberOfSensor; i++) {
				if(displaySensors[i] && tempHum[0])
					tempChart.series[i].show();
				else
					tempChart.series[i].hide();

				if(displaySensors[i] && tempHum[1])
					humChart.series[i].show();
				else
					humChart.series[i].hide();
			}
		}

		tempMoy=0, tempMax=0, tempMin=0;
		humMoy=0, humMax=0, humMin=0;
		totValue=0;
		for(i=0; i<numberOfSensor; i++) {
			for(j=0; j<sensorsData[i].length; j++) {
				if(Date.parse(startDate) < Date.parse(sensorsData[i][j].date) && Date.parse(endDate) > Date.parse(sensorsData[i][j].date)) {
					tempMoy += sensorsData[i][j].temperature.avg;
					tempMax += sensorsData[i][j].temperature.max;
					tempMin += sensorsData[i][j].temperature.min;
					humMoy += sensorsData[i][j].humidity.avg;
					humMax += sensorsData[i][j].humidity.max;
					humMin += sensorsData[i][j].humidity.min;
					totValue++;
				}
			}
		}
		$(".infos").html("De "+startDate.toLocaleDateString()+" "+startDate.toLocaleTimeString()+"<br>à "+endDate.toLocaleDateString()+" "+endDate.toLocaleTimeString()+"<br>"+
			"<br>Température :<br>Moyenne: "+(tempMoy/totValue).toFixed(2)+"<br>Minimum: "+(tempMin/totValue).toFixed(2)+"<br>Maximum: "+(tempMax/totValue).toFixed(2)+"<br>"+
			"<br>Humidité :<br>Moyenne: "+(humMoy/totValue).toFixed(2)+"<br>Minimum: "+(humMin/totValue).toFixed(2)+"<br>Maximum: "+(humMax/totValue).toFixed(2)
		)
  }
}

function downloadCSV() {
	tempHum[0] = $("input[name=Température]").is(":checked")
	tempHum[1] = $("input[name=Humidité]").is(":checked")
	for(i=0; i<numberOfSensor; i++)
		displaySensors[i] = $("input[name="+(i+1)+"]").is(":checked")

	startDate = new Date($("input[name=time_start]").val());
	endDate = new Date($("input[name=time_end]").val());

  dataAvailable = false;
  for(i=0; i<numberOfSensor; i++) {
    if(displaySensors[i] && sensorsData[i])
			for(j=0; j<sensorsData[i].length; j++) {
      	if(Date.parse(startDate) < Date.parse(sensorsData[i][j].date) && Date.parse(endDate) > Date.parse(sensorsData[i][j].date)) {
        	dataAvailable = true;
        	break;
				}
      }
  }

	if(!dataAvailable)
		return;

	file = "Capteur; Date; Donnee; Moyenne; Minimum; Maximum\n"
	for(i=0; i<numberOfSensor; i++) {
		if(!displaySensors[i])
			continue;

		sensorRows = ""
		for(j=0; j<sensorsData[i].length; j++) {
			if(Date.parse(startDate) < Date.parse(sensorsData[i][j].date) && Date.parse(endDate) > Date.parse(sensorsData[i][j].date)) {
				if(!(tempHum[0] || tempHum[1]))
					continue;

				row = ""
				date = new Date(sensorsData[i][j].date);
				if(tempHum[0]) {
					row += sensorsData[i][j].id + ";" + date.toLocaleDateString()+" "+date.toLocaleTimeString() + ";"
					row += "Temperature" + ";" + (sensorsData[i][j].temperature.avg).toFixed(2) + ";" + (sensorsData[i][j].temperature.min).toFixed(2) + ";" + (sensorsData[i][j].temperature.max).toFixed(2) + ";\n"
				} if(tempHum[1]) {
					row += sensorsData[i][j].id + ";" + date.toLocaleDateString()+" "+date.toLocaleTimeString() + ";"
					row += "Humidite" + ";" + (sensorsData[i][j].humidity.avg).toFixed(2) + ";" + (sensorsData[i][j].humidity.min).toFixed(2) + ";" + (sensorsData[i][j].humidity.max).toFixed(2) + ";\n"
				}

				sensorRows += row;
			}
		}
		file += sensorRows;
	}

	let link = document.createElement('a')
	link.id = 'download-csv'
	link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(file));
	link.setAttribute('download', 'données.csv');
	document.body.appendChild(link)
	link.style.display = "none"
	document.querySelector('#download-csv').click()
}

function storeData(data) {
  try {
    parsedData = JSON.parse(data)
  } catch(e) {return false;}

  for(i=0; i<numberOfSensor; i++)
    if(Number(parsedData.id.slice(-1)) === (i+1)) {
      parsedData.isValid = true

      parsedData.error = "no_err"
			if(parsedData.temperature.stddev > 40)
				parsedData.error = "Écart type de température trop élevé"
			else if(parsedData.temperature.current < -10)
				parsedData.error = "Température trop basse"
			else if(parsedData.temperature.current > 50)
				parsedData.error = "Température trop haute"
			else if(!(parsedData.temperature.min <= parsedData.temperature.avg && parsedData.temperature.avg <= parsedData.temperature.max))
				parsedData.error = "Incohérence des relevés : Tmin <= Tavg <= Tmax n'est pas respecté"

			else if(parsedData.humidity.stddev > 40)
				parsedData.error = "Écart type d'humidité trop élevé"
			else if(parsedData.humidity.current < -10)
				parsedData.error = "Température trop basse"
			else if(parsedData.humidity.current > 50)
				parsedData.error = "Température trop haute"
			else if(!(parsedData.humidity.min <= parsedData.humidity.avg && parsedData.humidity.avg <= parsedData.humidity.max))
					parsedData.error = "Incohérence des relevés : Hmin <= Havg <= Hmax n'est pas respecté"

			if(!parsedData.error === "no_err")
				parsedData.isValid = false

      sensorsData[i].unshift(parsedData)
    }

  if(Number(parsedData.id.slice(-1)) === 3 && parsedData.isValid)
    postOnDatabase(parsedData)

  if(Number(parsedData.id.slice(-1)) === numberOfSensor)
    return true

  return false
}

function postOnDatabase(parsedData) {
  var dbData = {
    sensor: parsedData.id,
    timestamp: parsedData.date,
    tcurrent: parsedData.temperature.current,
    tmin: parsedData.temperature.min,
    tmax: parsedData.temperature.max,
    tavg: parsedData.temperature.avg,
    tstddev: parsedData.temperature.stddev,
    hcurrent: parsedData.humidity.current,
    hmin: parsedData.humidity.min,
    hmax: parsedData.humidity.max,
    havg: parsedData.humidity.avg,
    hstddev: parsedData.humidity.stddev
  }

	for(key in dbData)
		if(!dbData[key])
			dbData[key] = 0;

  $.ajax({
    url: "http://51.38.239.114/db3",
    type: "POST",
    beforeSend: function(request) {
      request.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiZGIzIn0.RjMVon_kqMN2bZd2qzJI7MfRqDmWi7MX28ZnyXk1DGw")
    },
    data: dbData,
    error: function(err) {console.log("[ERROR] ", err.responseText, "\n", dbData)}
  });
}

function clearDatabase() {
  $.ajax({
    url: "http://51.38.239.114/db3",
    type: "DELETE",
    beforeSend: function(request) {
      request.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiZGIzIn0.RjMVon_kqMN2bZd2qzJI7MfRqDmWi7MX28ZnyXk1DGw")
    },
    success: function() {console.log("Database cleared")},
    error: function(err) {console.log("[ERROR] ", err.responseText)}
  });
}

function getDataFromDatabase(db) {
  $.ajax({
    url: "http://51.38.239.114/db"+(db+1),
    type: "GET",
    success: function(dbData) {
      for(j=0; j<dbData.length; j++) {
        var sensorData = {
          id: dbData[j].sensor,
          date: dbData[j].timestamp,
          isValid: true,
          temperature: {
            avg: dbData[j].tavg,
            min: dbData[j].tmin,
            max: dbData[j].tmax,
            stddev: dbData[j].tstddev,
            current: dbData[j].tcurrent
          },
          humidity: {
            avg: dbData[j].havg,
            min: dbData[j].hmin,
            max: dbData[j].hmax,
            stddev: dbData[j].hstdev,
            current: dbData[j].hcurrent
          }
        }

        id = Number(sensorData.id.substring(1)) - 1
        if(!isNaN(id))
          if(id >= 0 && id < numberOfSensor && id == db) {
            sensorsData[id].unshift(sensorData)
          }
      }

      if(db < numberOfSensor-1)
        getDataFromDatabase(db+1)
      else
        main();
    },
    error: function(err) {
      console.log("[ERROR] ", err.responseText)
      if(db < numberOfSensor-1)
        getDataFromDatabase(db+1)
      else
        main();
    }
  });
}

function printData() {
  console.log(sensorsData)
}

function initializeCharts() {
  var tempPoints = [[], [], [], [], [], [], []]
  var humPoints = [[], [], [], [], [], [], []]

	for(i=0; i<numberOfSensor; i++) {
		if(!sensorsData[i])
			continue;

			for(j=sensorsData[i].length - 11; j<sensorsData[i].length; j++) {
				if(!sensorsData[i][j])
					continue;

					if(sensorsData[i][j].date && sensorsData[i][j].temperature.current && sensorsData[i][j].humidity.current) {
						tempPoints[i].push([Date.parse(sensorsData[i][j].date)+7200000, sensorsData[i][j].temperature.current])
						humPoints[i].push([Date.parse(sensorsData[i][j].date)+7200000, sensorsData[i][j].humidity.current])
					}
			}

			tempPoints[i].sort(function(a,b) {return a[0] - b[0]});
			humPoints[i].sort(function(a,b) {return a[0] - b[0]});
	}


  tempChart = Highcharts.chart('temperatureChart', {
    chart: {
      type: "spline",
      backgroundColor: "#333333"
    },
    title: {
      text: "Les dernières températures reçues",
      style: {
        color: "#BF1226",
        fontWeight: "bold"
      }
    },
    xAxis: {
      type: "datetime",
      title: {
        text: "Date",
        style: {color: "#FFFFFF"}
      },
      labels: {
        text: "Date",
        style: {
          color: "#FFFFFF",
          fontWeight: "20px bold"
        }
      }
    },
    yAxis: {
      title: {
        text: "T °C",
        style: {color: "#FFFFFF"}
      },
      labels: {
        style: {
          color: "#FFFFFF",
          fontWeight: "20px bold"
        }
      }
    },
    legend: {
      itemStyle: {color: "#FFFFFF"},
      itemHoverStyle: {color: "#FFFFFF"}
    },
    series: [{
      name: "Capteur 1",
      color: "#BF1226",
      data: tempPoints[0]
    }, {
      name: "Capteur 2",
      color: "#BF1226",
      data: tempPoints[1]
    }, {
      name: "Capteur 3",
      color: "#BF1226",
      data: tempPoints[2]
    }, {
      name: "Capteur 4",
      color: "#BF1226",
      data: tempPoints[3]
    }, {
      name: "Capteur 5",
      color: "#BF1226",
      data: tempPoints[4]
    }, {
      name: "Capteur 6",
      color: "#BF1226",
      data: tempPoints[5]
    }, {
      name: "Capteur 7",
      color: "#BF1226",
      data: tempPoints[6]
    }]
  });

  humChart = Highcharts.chart('humidityChart', {
    chart: {
      type: "spline",
      backgroundColor: "#333333"
    },
    title: {
      text: "Les dernières humidités reçues",
      style: {
        color: "#097479",
        fontWeight: "bold"
      }
    },
    xAxis: {
      type: "datetime",
      title: {
        text: "Date",
        style: {color: "#FFFFFF"}
      },
      labels: {
        text: "Date",
        style: {
          color: "#FFFFFF",
          fontWeight: "20px bold"
        }
      }
    },
    yAxis: {
      title: {
        text: "H %",
        style: {color: "#FFFFFF"}
      },
      labels: {
        style: {
          color: "#FFFFFF",
          fontWeight: "20px bold"
        }
      }
    },
    legend: {
      itemStyle: {color: "#FFFFFF"},
      itemHoverStyle: {color: "#FFFFFF"}
    },
    series: [{
      name: "Capteur 1",
      color: "#097479",
      data: humPoints[0]
    }, {
      name: "Capteur 2",
      color: "#097479",
      data: humPoints[1]
    }, {
      name: "Capteur 3",
      color: "#097479",
      data: humPoints[2]
    }, {
      name: "Capteur 4",
      color: "#097479",
      data: humPoints[3]
    }, {
      name: "Capteur 5",
      color: "#097479",
      data: humPoints[4]
    }, {
      name: "Capteur 6",
      color: "#097479",
      data: humPoints[5]
    }, {
      name: "Capteur 7",
      color: "#097479",
      data: humPoints[6]
    }]
  });
}