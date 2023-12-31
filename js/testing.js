// Audio interface variables
var audioInterface = window.AudioContext || window.webkitAudioContext;
var outputDevice = new audioInterface();
var gainNode = outputDevice.createGain();
var oscillator = gainNode.context.createOscillator();

// Constants
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

const GAIN_START      = 0.5;
const MIN_FREQUENCY   = 80;
const MAX_FREQUENCY   = 20000;
const ADJUST_TIME     = 60000; // in milliseconds 

const RAMP_MAP = [
    { // Base ramp
        BOUNDS: {
            UPPER: 0.05,
            LOWER: 0.025,
        },
        MULTIPLIERS: {
            UPPER: 15,
            MID:   1,
            LOWER: 0.075,
        }
    },
    { // Sensitive ramp
        BOUNDS: {
            UPPER: 0.02,
            LOWER: 0.005,
        },
        MULTIPLIERS: {
            UPPER: 20,
            MID:   0.075,
            LOWER: 0.0175,
        }
    }
];
var RAMP       = 0;
/********************************************/

// Route tracking variables
var intervalTracker;
var timeoutTracker;

// Testing variables
var testing = false;
var testType = -1;
var gainValue = GAIN_START;
var isMuted = false;
var intervalCount = 0;
var FREQUENCY_INTERVAL = 200;
var TEST_NAME          = "";
var levels = [];

// UI variables
var TOUCHSCREEN        = false;
var chart;

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
    gainNode.gain.value = startOn|0 * GAIN_START; // Converts boolean to integer
}

function stageAudio(startOn) {
    gainNode = outputDevice.createGain();
    gainNode.connect(outputDevice.destination);
    gainNode.gain.value = startOn|0 * GAIN_START;
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
    RAMP = document.getElementById("rampSelect").checked|0;
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
    timeoutTracker = setTimeout(testSelection, ADJUST_TIME);
    intervalTracker = setInterval(
        frequencyIncrease, 
        Math.random()*49 + 1, 
        increaseTypes.LOGARITHMIC, 0, SPAWN_NEW
    );
}

function resetTesting() {
    levels = [];
    clearInterval(intervalTracker);
    clearAudio();
    for (let i = 0; i < document.getElementsByClassName("testing").length; i++) {
        document.getElementsByClassName("testing")[i].close();
    }
    document.getElementById("testIntro").style.display = "flex";
    if (testType != -1){
        if (TOUCHSCREEN){
            for (const element of document.getElementsByName("mobileInputContainer")[testType].children){
                element.style.display = "none";
            }
            document.getElementsByName("mobileStart")[testType].style.display = "inline";
            document.getElementsByName("mobileInputContainer")[testType].style.display = "inline-flex";
        } else {
            document.getElementsByClassName("keyboardInput")[testType].style.display = "flex";
        }
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
    clearTimeout(timeoutTracker);
    resetAudio(false);
    transitionDialog(2);
}

function test(elementPosition, color){
    if (!testing){ return; }
    TOUCHSCREEN = window.getComputedStyle(document.getElementsByName("mobileInputContainer")[0]).display != "none";
    document.getElementsByClassName("testing")[2].close();
    document.getElementsByClassName("testing")[elementPosition].showModal();
    testType = elementPosition - 3;
    chart = new Chart(
        document.getElementsByClassName("frChart")[testType], 
        {
        type: "line",
        data: {
            datasets: [{
                label: "Frequency Response",
                backgroundColor: [],
                pointRadius: 4,
                borderColor: color,
                data: [],
                cubicInterpolationMode: 'monotone',
                tension: 0.4,
                z: 1,
            }, 
            {
                label: "X-Axis",
                backgroundColor: "rgb(255, 255, 255)",
                pointRadius: 0,
                borderColor: "rgb(255, 255, 255)",
                borderDash: [5, 5],
                data: [
                    {x: 50, y: 0},
                    {x: 21000, y: 0}
                ],
            }],
        },
        options: {
            color: "rgb(255, 255, 255)",
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Frequency (Hz)',
                        color: "rgb(255, 255, 255)",
                    },
                    ticks: {
                        color: "rgb(255, 255, 255)",
                    },
                    position: 'bottom',
                    min: 50,
                    max: 21000,
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Relative Volume (%)',
                        color: "rgb(255, 255, 255)",
                    },
                    ticks: {
                        color: "rgb(255, 255, 255)",
                    },
                    position: 'left',
                    suggestedMin: -5,
                    suggestedMax:  5,
                }
            },
        },
    });
    document.getRootNode().addEventListener("keydown", keyPress);
    resetAudio(false);
}

function pushData(x, y, color){
    chart.config.data.datasets[0].data.push({x: x, y: y});
    levels.push(y);
    let average = 0;
    let count = 0;
    for (let i = 0; i < levels.length; i++){
        if (levels[i] != 0){
            average += levels[i];
            count++;
        }
    }
    average /= count;
    for (let i = 0; i < levels.length; i++){
        if (levels[i] != 0){
            chart.config.data.datasets[0].data[i].y = (levels[i] - average)/average*(-100);
        } else {
            chart.config.data.datasets[0].data[i].y = 0;
        }
    }
    chart.config.data.datasets[0].backgroundColor.push(color);
    chart.update();
    frequencyIncrease(increaseTypes.LINEAR, FREQUENCY_INTERVAL, RESET);
    if (oscillator.frequency.value >= MAX_FREQUENCY){
        clearInterval(intervalTracker);
        document.getRootNode().removeEventListener("keydown", keyPress);
        if (!TOUCHSCREEN){
            document.getElementsByClassName("keyboardInput")[testType].style.display = "none";
            document.getElementsByClassName("startIndicator")[testType].style.display = "inline";
        } else {
            document.getElementsByName("mobileInputContainer")[testType].style.display = "none";
        }
        document.getElementsByClassName("exportOptions")[testType].style.display = "flex";
        clearAudio();
        testing = false;
        return;
    }
    gainNode.gain.value = GAIN_START;
    gainValue = GAIN_START;
    isMuted = false;
}

function keyPress(event){
    let stateElement = document.getElementsByClassName("startIndicator")[testType];
    let isHidden = stateElement.style.display == "none";
    switch (event.key) {
        case "ArrowRight":
            if (!isHidden || (testType != sideTypes.BOTH)){
                break;
            }
            document.getElementsByClassName("indicateZero")[testType].style.display = "none";
            pushData(
                oscillator.frequency.value, 
                gainValue,
                "rgba(255, 0, 0)"
            );
            break;
        case "ArrowLeft":
            if (!isHidden || (testType != sideTypes.BOTH)){
                break;
            }
            document.getElementsByClassName("indicateZero")[testType].style.display = "none";
            pushData(
                oscillator.frequency.value,
                gainValue,
                "rgba(0, 0, 255)"
            );
            break;
        case "Enter":
            if (isHidden){ break; }
            stateElement.style.display = "none";
            gainNode.gain.value = GAIN_START;
            gainValue = GAIN_START;
            intervalTracker = setInterval(changeGain, 1, -0.0001);
            break;
        case " ":
            if (!isHidden){ break; }
            document.getElementsByClassName("indicateZero")[testType].style.display = "none";
            pushData(
                oscillator.frequency.value, 
                gainValue,
                chart.config.data.datasets[0].borderColor
            );
            break;
        case "0":
            if (!isHidden){ break; }
            document.getElementsByClassName("indicateZero")[testType].style.display = "none";
            pushData(
                oscillator.frequency.value,
                0,
                "rgb(0, 0, 0)"
            );
        default:
            break;
    }
}

function mobileInputStart(srcElement){
    for (let i = 0; i < srcElement.parentNode.children.length; i++){
        srcElement.parentNode.children[i].style.display = "inline";
    }
    srcElement.style.display = "none";
    gainNode.gain.value = GAIN_START;
    gainValue = GAIN_START;
    intervalTracker = setInterval(changeGain, 1, -0.0001);
}

function mobileInputUnilateral(){
    document.getElementsByClassName("indicateZero")[testType].style.display = "none";
    pushData(
        oscillator.frequency.value,
        gainValue,
        chart.config.data.datasets[0].borderColor
    );
}

function mobileInputBilateral(color){
    document.getElementsByClassName("indicateZero")[testType].style.display = "none";
    pushData(
        oscillator.frequency.value,
        gainValue,
        color
    );
}

function mobileInputInaudible(){
    document.getElementsByClassName("indicateZero")[testType].style.display = "none";
    pushData(
        oscillator.frequency.value,
        0,
        "rgb(0, 0, 0)"
    );
}

function changeGain(value){
    if (gainValue > RAMP_MAP[RAMP].BOUNDS.UPPER){
        gainValue += value * RAMP_MAP[RAMP].MULTIPLIERS.UPPER;
    } else if (gainValue > RAMP_MAP[RAMP].BOUNDS.LOWER){
        gainValue += value * RAMP_MAP[RAMP].MULTIPLIERS.MID;
    } else if ((gainValue - (value * RAMP_MAP[RAMP].MULTIPLIERS.LOWER)) > 0.000001){
        gainValue += value * RAMP_MAP[RAMP].MULTIPLIERS.LOWER;
    } else {
        document.getElementsByClassName("indicateZero")[testType].style.display = "block";
        gainValue = 0x00;
        while (gainValue != 0x00){
            gainValue = 0x00;
        }
    }

    intervalCount++;
    if (((intervalCount % 60)/30) >= 1.4){ 
        gainNode.gain.value = 0x00;
    } else {
        gainNode.gain.value = gainValue;
    }
    isMuted = !isMuted;
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