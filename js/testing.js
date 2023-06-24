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

const MIN_FREQUENCY   = 20;
const MAX_FREQUENCY   = 20000;
const ADJUST_TIME     = 60000; // in milliseconds 
const GAIN_MULTIPLIER = 1;

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
]
var RAMP       = 0;

var FREQUENCY_INTERVAL = 200;
var TEST_NAME          = "";
var TOUCHSCREEN        = false;

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
    setTimeout(testSelection, ADJUST_TIME);
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
                borderColor: color,
                data: [],
                cubicInterpolationMode: 'monotone',
                tension: 0.4
            }],
        },
        options: {
            color: "rgb(255, 255, 255)",
            elements: {
                point: {
                    radius: 4,
                },
            },
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
                    min: 20,
                    max: 20000,
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Volume',
                        color: "rgb(255, 255, 255)",
                    },
                    ticks: {
                        color: "rgb(255, 255, 255)",
                    },
                    position: 'left',
                    min: 0,
                    suggestedMax: 0.02,
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
    gainNode.gain.value = 1;
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
                gainNode.gain.value * GAIN_MULTIPLIER,
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
                gainNode.gain.value * GAIN_MULTIPLIER,
                "rgba(0, 0, 255)"
            );
            break;
        case "Enter":
            if (isHidden){ break; }
            stateElement.style.display = "none";
            gainNode.gain.value = 1;
            intervalTracker = setInterval(changeGain, 1, -0.0001);
            break;
        case " ":
            if (!isHidden){ break; }
            document.getElementsByClassName("indicateZero")[testType].style.display = "none";
            pushData(
                oscillator.frequency.value, 
                gainNode.gain.value * GAIN_MULTIPLIER,
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
    gainNode.gain.value = 1;
    intervalTracker = setInterval(changeGain, 1, -0.0001);
}

function mobileInputUnilateral(){
    document.getElementsByClassName("indicateZero")[testType].style.display = "none";
    pushData(
        oscillator.frequency.value,
        gainNode.gain.value * GAIN_MULTIPLIER,
        chart.config.data.datasets[0].borderColor
    );
}

function mobileInputBilateral(color){
    document.getElementsByClassName("indicateZero")[testType].style.display = "none";
    pushData(
        oscillator.frequency.value,
        gainNode.gain.value * GAIN_MULTIPLIER,
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
    let gain = gainNode.gain.value;

    if (gain > RAMP_MAP[RAMP].BOUNDS.UPPER){
        gainNode.gain.value += value * RAMP_MAP[RAMP].MULTIPLIERS.UPPER;
    } else if (gain > RAMP_MAP[RAMP].BOUNDS.LOWER){
        gainNode.gain.value += value * RAMP_MAP[RAMP].MULTIPLIERS.MID;
    } else if ((gain - (value * RAMP_MAP[RAMP].MULTIPLIERS.LOWER)) > 0){
        gainNode.gain.value += value * RAMP_MAP[RAMP].MULTIPLIERS.LOWER;
    } else {
        gainNode.gain.value = 0;
        document.getElementsByClassName("indicateZero")[testType].style.display = "block";
    }
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