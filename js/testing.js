var audioInterface = window.AudioContext || window.webkitAudioContext;
var outputDevice = new audioInterface();
var gainNode = outputDevice.createGain();
var oscillator = gainNode.context.createOscillator();
var intervalTracker;
var testing = false;
var testType = -1;
var chart;

const sideTypes = {
    LEFT: 0,
    BOTH: 1,
    RIGHT: 2,
}

const increaseTypes = {
    LINEAR: 0,
    LOGARITHMIC: 1,
}

const LOOP = 0;
const SPAWN_NEW = 1;
const RESET = 2;

const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 20000;
const GAIN_MULTIPLIER = 1;

var FREQUENCY_INTERVAL = 200;
var TEST_NAME = "";

function frequencyIncrease(type, value, action) {
    switch (type) {
        case increaseTypes.LINEAR:
            oscillator.frequency.value += value;
            break;
        case increaseTypes.LOGARITHMIC:
            oscillator.frequency.value += 20 ** Math.min((Math.log10(oscillator.frequency.value)|0)-1, 2);
            break;
        default:
            break;
    }
    switch (action) {
        case LOOP:
            if (oscillator.frequency.value >= MAX_FREQUENCY) {
                oscillator.frequency.value = MIN_FREQUENCY;
            }
            break;
        case SPAWN_NEW:
            if (oscillator.frequency.value >= MAX_FREQUENCY) {
                oscillator.frequency.value = MIN_FREQUENCY;
                clearInterval(intervalTracker);
                intervalTracker = setInterval(
                    frequencyIncrease, 
                    Math.random()*49 + 1, 
                    type,
                    value,
                    action
                );
            }
            break;
        case RESET:
            break;
        default:
            break;
    }
}

function resetAudio(startOn) {
    oscillator.frequency.value = MIN_FREQUENCY;
    gainNode.gain.value = startOn|0; // Converts boolean to integer
}

function stageAudio(startOn) {
    gainNode = outputDevice.createGain();
    gainNode.connect(outputDevice.destination);
    oscillator = gainNode.context.createOscillator();
    oscillator.connect(gainNode);
    oscillator.start();
    resetAudio(startOn);
}

function clearAudio() {
    oscillator.stop();
    gainNode.disconnect();
}

function startVolumeCalibration() {
    if (testing){ return; }
    testing = true;
    document.getElementById("testIntro").style.display = "none";
    FREQUENCY_INTERVAL = document.getElementById("increment").value|0;
    TEST_NAME = document.getElementById("testName").value;
    if (TEST_NAME == "") {
        TEST_NAME = "Test";
    }
    document.getElementsByClassName("testing")[0].showModal();
    stageAudio(true);
    intervalTracker = setInterval(frequencyIncrease, 20, increaseTypes.LOGARITHMIC, 0, LOOP);
}

function transitionDialog(target) {
    document.getElementsByClassName("testing")[target - 1].close();
    document.getElementsByClassName("testing")[target].showModal();
}

function stopVolumeCalibration() {
    clearInterval(intervalTracker);
    transitionDialog(1);
    resetAudio(true);
    setTimeout(testSelection, 60000);
    intervalTracker = setInterval(
        frequencyIncrease, 
        Math.random()*49 + 1, 
        increaseTypes.LOGARITHMIC, 0, SPAWN_NEW
    );
}

function resetTesting() {
    clearInterval(intervalTracker);
    clearAudio();
    for (let i = 0; i < document.getElementsByClassName("testing").length; i++) {
        document.getElementsByClassName("testing")[i].close();
    }
    document.getElementById("testIntro").style.display = "flex";
    if (testType != -1){
        document.getElementsByClassName("inTestDirections")[testType].style.display = "flex";
        document.getElementsByClassName("exportOptions")[testType].style.display = "none";
        testType = -1;
    }
    if (chart != undefined){
        chart.clear();
        chart.destroy();
    }
    testing = false;
}

function testSelection(){
    if (!testing){ return; }
    clearInterval(intervalTracker);
    resetAudio(false);
    transitionDialog(2);
}

function test(elementPosition, color){
    if (!testing){ return; }
    document.getElementsByClassName("testing")[2].close();
    document.getElementsByClassName("testing")[elementPosition].showModal();
    testType = elementPosition - 3;
    chart = new Chart(
        document.getElementsByClassName("frChart")[testType], 
        {
        type: "line",
        color: "rgba(200, 200, 200)",
        data: {
            datasets: [{
                label: "Frequency Response",
                backgroundColor: [],
                borderColor: color,
                data: [],
                cubicInterpolationMode: 'monotone',
                tension: 0.4
            }],
        },
        options: {
            elements: {
                point: {
                    radius: 4,
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 20,
                    max: 20000,
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 0.2,
                }
            },
        },
    });
    document.getRootNode().addEventListener("keydown", keyPress);
    resetAudio(false);
}

function pushData(x, y, color){
    chart.config.data.datasets[0].data.push({
        x: x,
        y: y,
    });
    chart.config.data.datasets[0].backgroundColor.push(color);
    chart.update();
    frequencyIncrease(increaseTypes.LINEAR, FREQUENCY_INTERVAL, RESET);
    if (oscillator.frequency.value >= MAX_FREQUENCY){
        clearInterval(intervalTracker);
        document.getRootNode().removeEventListener("keydown", keyPress);
        document.getElementsByClassName("inTestDirections")[testType].style.display = "none";
        document.getElementsByClassName("exportOptions")[testType].style.display = "flex";
        document.getElementsByClassName("startIndicator")[testType].hidden = false;
        clearAudio();
        testing = false;
        return;
    }
    gainNode.gain.value = 1;
}

function keyPress(event){
    let stateElement = document.getElementsByClassName("startIndicator")[testType];
    switch (event.key) {
        case "ArrowRight":
            if (!stateElement.hidden || (testType != sideTypes.BOTH)){
                break;
            }
            pushData(
                oscillator.frequency.value, 
                gainNode.gain.value * GAIN_MULTIPLIER,
                "rgba(255, 0, 0)"
            );
            break;
        case "ArrowLeft":
            if (!stateElement.hidden || (testType != sideTypes.BOTH)){
                break;
            }
            pushData(
                oscillator.frequency.value,
                gainNode.gain.value * GAIN_MULTIPLIER,
                "rgba(0, 0, 255)"
            );
            break;
        case "Enter":
            if (stateElement.hidden){ break; }
            stateElement.hidden = true;
            gainNode.gain.value = 1;
            intervalTracker = setInterval(changeGain, 20, -0.005);
            break;
        case " ":
            if (!stateElement.hidden){ break; }
            pushData(
                oscillator.frequency.value, 
                gainNode.gain.value * GAIN_MULTIPLIER,
                chart.config.data.datasets[0].borderColor
            );
            break;
        case "0":
            if (!stateElement.hidden){ break; }
            pushData(
                oscillator.frequency.value,
                0,
                "rgb(0, 0, 0)"
            );
        default:
            break;
    }
}

function changeGain(value){
    if (gainNode.gain.value <= 0){
        pushData(
            oscillator.frequency.value, 
            0,
            chart.config.data.datasets[0].borderColor
        );
    } else if (gainNode.gain.value < 0.01){
        gainNode.gain.value += value * 0.001;
    } else if (gainNode.gain.value < 0.1){
        gainNode.gain.value += value * 0.05;
        return;
    }
    gainNode.gain.value += value;
}

function downloadImage(){
    var link = document.createElement('a');
    let dt = new Date();
    link.download = `${TEST_NAME}_${Object.keys(sideTypes)[testType]}_${dt.getMonth()}-${dt.getDate()}-${dt.getYear()}.jpg`;
    link.href = chart.toBase64Image("image/jpeg", 1);
    link.click();
}

function downloadCSV(){
    var link = document.createElement('a');
    let dt = new Date();
    link.download = `${TEST_NAME}_${Object.keys(sideTypes)[testType]}_${dt.getMonth()}-${dt.getDate()}-${dt.getYear()}.csv`;
    if (testType == sideTypes.BOTH){
        link.href =  'data:text/csv;charset=utf-8,' + encodeURIComponent(
            chart.config.data.datasets[0].data.map(
                (point) => point.x + "," + point.y + "," + point.backgroundColor
            ).join("\n")
        );
    } else {
        link.href =  'data:text/csv;charset=utf-8,' + encodeURIComponent(
            chart.config.data.datasets[0].data.map(
                (point) => point.x + "," + point.y
            ).join("\n")
        );
    }
    link.click();
}