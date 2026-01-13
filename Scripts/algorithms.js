import { updateTrackName, globalState, updateSegmentElementsList, updateTimeline, loadSong, setExternalSegment, setExternalAutoSegment } from './globalData.js';
import htmlElements from './globalData.js';
const PY_SERVER_PORT = 5001;
const PY_SERVER_BASE = `http://127.0.0.1:${PY_SERVER_PORT}`;

// Import button
htmlElements.importButton.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const filePaths = await window.api.openFile();
    if (filePaths && filePaths.length > 0) {
        let waveformNum = await loadSong(filePaths[0]);
        let filePathEnd = window.api.pathBasename(filePaths[0]);
        updateTrackName(filePathEnd, waveformNum);
    } else {
        console.log('No file selected');
    }
});

// Runs the segmentation algorithm
setExternalSegment(segment);
async function segment(algorithm, waveformNum) {
    const inputName = window.songFilePaths[waveformNum];
    window.clusters[waveformNum] = determineVariability(waveformNum);
    try {
        console.log("Segmenting begin");

        // Send a POST request to the Python server
        const response = await fetch(`${PY_SERVER_BASE}/call-python`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ song: inputName, algorithm : algorithm, clusters : window.clusters[waveformNum] }),
        });

        console.log("Segmenting end");

        // Parse the JSON response
        const data = await response.json();
        window.segmentData[waveformNum] = data.map(row => {
            return Object.fromEntries(row.map((value, index) => [globalState.headers[index], value]));
        });

        console.log(window.segmentData[waveformNum])

        // Add in segment annotation
        window.segmentData[waveformNum].forEach(obj => {
            obj.label = obj.label + 1;
            obj.label = String(obj.label);
            obj.annotation = "";
        });

        updateSegmentElementsList(window.segmentData[waveformNum], true, waveformNum)
    } catch (error) {
        console.error('Error:', error);
    }
}

// Determines the variability to be used for an algorithm
function determineVariability(waveformNum) {
    //TODO fix with new slider
    // const target = document.getElementById('variability-slider');
    // let num = parseInt(Number(target.value)/100) + 2
    // console.log(num)
    // return num

    // new implimentation in the tracks
    // !! put in try catch in case of fuckup id assignments
    const target = document.getElementById('cluster-dial' + String(waveformNum));
    let num = parseInt(target.value)
    console.log(`cluster value: ${num}`)
    return num

    // return 4;
}

// Auto segments
setExternalAutoSegment(autoSegment);
async function autoSegment(clusters, closestClusters, closestAverage, finalCall, waveformNum) {
    const inputName = window.songFilePaths[waveformNum];
    try {
        console.log("Segmenting begin");

        // Send a POST request to the Python server
        const response = await fetch(`${PY_SERVER_BASE}/call-python`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ song: inputName, algorithm : 4, clusters : clusters }),
        });

        console.log("Segmenting end");

        // Parse the JSON response
        const data = await response.json();

        let segmentData = data.map(row => {
            return Object.fromEntries(row.map((value, index) => [globalState.headers[index], value]));
        });

        // Add in segment annotation
        segmentData.forEach(obj => {
            obj.label = obj.label + 1;
            obj.label = String(obj.label);
            obj.annotation = "";
        });

        let average = determineAverageSegmentLength(segmentData);

        if(finalCall) {
            window.segmentData[waveformNum] = segmentData;
            window.clusters[waveformNum] = closestClusters;
            updateSegmentElementsList(window.segmentData[waveformNum], true, waveformNum);
            return;
        }

        if(Math.abs(average - 25) < closestAverage) {
            closestAverage = Math.abs(average - 25);
            closestClusters = clusters;

            if(average < 25) {
                autoSegment(clusters-1, closestClusters, closestAverage, false, waveformNum);
            } else {
                autoSegment(clusters+1, closestClusters, closestAverage, false, waveformNum);
            }
        } else {
            autoSegment(closestClusters, closestClusters, closestAverage, true, waveformNum);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Determines average length of all segments in the song
function determineAverageSegmentLength(segmentData) {
    let totalLength = 0;
    segmentData.forEach(element => {
        totalLength += element.end - element.start;
    });
    return totalLength/segmentData.length;
}
