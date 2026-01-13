import WaveSurfer from '../resources/wavesurfer/wavesurfer.esm.js';
import RegionsPlugin from '../resources/wavesurfer/regions.esm.js';
import ZoomPlugin from '../resources/wavesurfer/zoom.esm.js';
import TimelinePlugin from '../resources/wavesurfer/timeline.esm.js';

// Global variables
window.trackNames = []; // track names
window.songFilePaths = []; // file paths for songs
window.segmentData = []; // segment data for each track
window.clusters = []; // cluster value being used for the track
window.currentWaveformNum;
window.currentProject = '';

let currentlyEditing = false; // whether segment boundaries are being modified
let zoomTimeout; // zoom timeout for updating display

// Global state variables that are used across the entire application
export let globalState = {
    headers: ["number", "start", "end", "label"], // headers for segment data
    currentZoom: 10,
    timelines: [], // timelines for each track
    groupEditingMode: 0,
    wavesurferWaveforms: [],
    markerNotes: [], // markers for each track
    regionType: [], // stores whether the region is a region or marker
    globalTimelineMode: false,
    segmentAnnotationsPresent: false,
    editBoundaryMode: false,
    waveformNums: [], // stores track numbers
    labelColors: [], // label colors for each track
    colorLegendMap: new Map(), // global legend for color preferences
    regions: [], // stores wavesurfer regions for each track
    defaultColors: [
        `rgba(213, 133, 42, 0.5)`,
        `rgba(79, 120, 176, 0.5)`,
        `rgba(132, 192, 63, 0.5)`,
        `rgba(142, 87, 168, 0.5)`,
        `rgba(169, 86, 88, 0.5)`,
        `rgba(180, 205, 50, 0.5)`,
        `rgba(62, 66, 193, 0.5)`,
        `rgba(186, 69, 144, 0.5)`,
        `rgba(88, 167, 109, 0.5)`    
    ]
};

// Global html elements that are accessed across the application
const htmlElements = {
    // Larger elements
    timeline: document.getElementById("waveforms"),
    tracksWindow: document.getElementById('tracks-window'),

    // Constants for HTML elements
    segmentDetailsDialog: document.querySelector('#segment-details-dialog'),
    removeBoundaryDialog: document.querySelector('#remove-boundary-dialog'),

    // import/export buttons
    importButton: document.getElementById('chooseSong'),

    // Segment buttons
    closeDialogButton: document.querySelector('#close-dialog'),

    // algorithm buttons
    algorithm1Button: document.getElementById("segment-algorithm1"),
    algorithm2Button: document.getElementById("segment-algorithm2"),
    algorithm3Button: document.getElementById("segment-algorithm3"),
    algorithm4Button: document.getElementById("segment-algorithm4"),
    algorithmAutoButton: document.getElementById("auto-segment"),

    // load track menu dialog
    loadTrackMenuDialog: document.querySelector('#load-track-dialog'),
    loadTrackFiles: document.getElementById('load-track-files'),
    closeLoadTrackDialogButton: document.querySelector('#close-load-track-dialog'),

    // save track menu dialog
    saveTrackMenuDialog: document.querySelector('#save-track-dialog'),
    saveTrackFiles: document.getElementById('save-track-files'),
    saveTrackInput: document.getElementById('save-track-input'),
    createNewTrackButton: document.getElementById('create-new-track-button'),
    saveTrackAudioCheckbox: document.getElementById('save-track-audio-checkbox'),
    closeSaveTrackDialogButton: document.querySelector('#close-save-track-dialog'),

    // delete track menu dialog
    deleteTrackMenuDialog: document.querySelector('#delete-track-dialog'),
    deleteTrackFiles: document.getElementById('delete-track-files'),
    closeDeleteTrackDialogButton: document.querySelector('#close-delete-track-dialog'),

    // load project menu dialog
    loadProjectMenuDialog: document.querySelector('#load-project-dialog'),
    loadProjectFiles: document.getElementById('load-project-files'),
    closeLoadProjectDialogButton: document.querySelector('#close-load-project-dialog'),

    // save project menu dialog
    saveProjectMenuDialog: document.querySelector('#save-project-dialog'),
    saveProjectInput: document.getElementById('save-project-input'),
    saveProjectFiles: document.getElementById('save-project-files'),
    createNewProjectButton: document.getElementById('create-new-project-button'),
    saveProjectAudioCheckbox: document.getElementById('save-project-audio-checkbox'),
    closeSaveProjectDialogButton: document.querySelector('#close-save-project-dialog'),

    // delete project menu dialog
    deleteProjectMenuDialog: document.querySelector('#delete-project-dialog'),
    deleteProjectFiles: document.getElementById('delete-project-files'),
    closeDeleteProjectDialogButton: document.querySelector('#close-delete-project-dialog'),

    // are you sure dialog
    areYouSureDialog: document.querySelector('#are-you-sure-dialog'),
    areYouSureHeader: document.getElementById('are-you-sure-header'),
    yesOrNo: document.querySelector('#yes-or-no'),
    closeAreYouSureDialogButton: document.querySelector('#close-are-you-sure-dialog'),

    // error dialog
    errorDialog: document.getElementById('error-dialog'),
    closeErrorDialogButton: document.getElementById('close-error-dialog'),
    errorDialogMessage: document.getElementById('error-message'),

    // marker dialog
    markerDialog: document.getElementById('marker-dialog'),
    closeMarkerDialog: document.getElementById('marker-dialog-close'),
    deleteMarker: document.getElementById('delete-marker'),
    saveMarker: document.getElementById('save-marker'),
    markerTitle: document.getElementById('marker-dialog-title'),
    markerNote: document.getElementById('marker-dialog-note'),

    // Title Change dialog
    titleChangeDialog: document.getElementById('title-change-dialog'),
    closeTitleChangeDialog: document.getElementById('title-change-dialog-close'),
    titleChangeSave: document.getElementById('title-change-save'),
    titleChangeInput: document.getElementById('new-title-input'),

    // color related elements
    colorDialog: document.getElementById('color-dialog'),
    colorPreferenceDialog: document.getElementById('color-preference-dialog'),
    colorContainer: document.getElementById('color-container'),
    colorPreferencesButton: document.getElementById('colorPreferences'),
    colorLegend: document.getElementById('color-legend'),
    colorLegendTextInput: document.getElementById('color-legend-text-input'),
    colorLegendColorInput: document.getElementById('color-legend-color-input'),
    colorLegendSave: document.getElementById('save-color'),
    colorPreferenceCloseDialog: document.getElementById('color-preference-dialog-close'),

    // project buttons
    openWorkspaceButton: document.getElementById('open-workspace'),
    loadTrackButton: document.getElementById('load-track'),
    deleteTrackButton: document.getElementById('delete-track'),
    loadProjectButton: document.getElementById('load-project'),
    saveProjectButton: document.getElementById('save-project'),
    deleteProjectButton: document.getElementById('delete-project'),

    // drop down stuff
    fileDropdownContent: document.getElementById("file-dropdown-content"),
    fileDropdown: document.getElementById("file-dropdown"),
    fileDropdownButton: document.getElementById("file-dropdown-button"),
    algorithmsDropdownContent: document.getElementById("algorithms-dropdown-content"),
    algorithmsDropdown: document.getElementById("algorithms-dropdown"),
    algorithmsDropdownButton: document.getElementById("algorithms-dropdown-button"),
    boundariesDropdownContent: document.getElementById("boundaries-dropdown-content"),
    boundariesDropdown: document.getElementById("boundary-dropdown"),
    boundariesDropdownButton: document.getElementById("boundary-dropdown-button"),

    groupEditingButton: document.getElementById("group-editing"),
    segmentAnnotationButton: document.getElementById("segment-annotations"),
    globalTimelineButton: document.getElementById("global-timeline"),
    modifyBoundariesButton: document.getElementById("modify-boundaries"),
    zoomFullButton: document.getElementById("zoom-full"),
    trackExpandButton: document.getElementById("expand-button"),
    trackUnexpandButton: document.getElementById("unexpand-button"),
    trackTime: document.getElementById("track-time"),
};
export default htmlElements;

const iconSize = "20px";

// Give regions a random color when there are no more default colors
const random = (min, max) => Math.random() * (max - min) + min
const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`


// ---------------------------------------------
// makes the segment button have a loading state
// ---------------------------------------------

// initiate loading state of button
export function LoadingState(button) {

    // call all children elements of our button
    const childNodes = button.childNodes;
    
    // assign each child to a variable
    // current convention is the first element (<i>) will be the loading symbol, 
    // and the second element (<span>) will be the button content
    const Licon = childNodes[1]
    const Bicon = childNodes[0];

    // actually set the content to loading state
    Licon.style.display = "grid";
    Bicon.style.display = "none";
}


// this function resets any button from loading state back to static and ready
export function ResetButtonContent(button) {

    // call all children elements of our button
    // const button = document.getElementById(id);
    const childNodes = button.childNodes;
    
    // assign each child to a variable
    // current convention is the first element (<i>) will be the loading symbol, 
    // and the second element (<span>) will be the button content
    // I have no clue why there's empty elements at index 1,3,and 5, so proceed with caution here. 
    const Licon = childNodes[1];
    const Bicon = childNodes[0];

    // actually reset the content
    Licon.style.display = "none";
    Bicon.style.display = "grid";
}

// ---------------------------------------------
// end of loading shinanigans
// ---------------------------------------------






// Sets external functions that need access in other files
let externalOpenMarker = null;
export function setExternalOpenMarker(fn) {
    externalOpenMarker = fn;
}

let externalLoadColorPreferences = null;
export function setExternalLoadColorPreferences(fn) {
    externalLoadColorPreferences = fn;
}

let externalSegment = null;
export function setExternalSegment(fn) {
    externalSegment = fn;
}

let externalAutoSegment = null;
export function setExternalAutoSegment(fn) {
    externalAutoSegment = fn;
}

let externalAddBoundary = null;
export function setExternalAdd(fn) {
    externalAddBoundary = fn;
}

let externalRemoveBoundary = null;
export function setExternalRemove(fn) {
    externalRemoveBoundary = fn;
}

let externalChangeBoundary = null;
export function setExternalChange(fn) {
    externalChangeBoundary = fn;
}

let externalAddMarker = null;
export function setExternalAddMarker(fn) {
    externalAddMarker = fn;
}

let externalSaveTrack = null;
export function setExternalSaveTrack(fn) {
    externalSaveTrack = fn;
}

let externalExportData = null;
export function setExternalExportData(fn) {
    externalExportData = fn;
}

// updates the trackname of the given waveform
export function updateTrackName(name, waveformNum) {
    
    // Check to make sure the name is available
    let uniqueTitle = false;
    let currentTitle = name;
    
    while (!uniqueTitle) {
        
        uniqueTitle = true;
        //Run for loop to check if the initial title is taken
        for (var i = 0; i < window.trackNames.length; i++) {
            if (i != waveformNum && window.trackNames[i] == currentTitle) {
                uniqueTitle = false;
            };
        };

        if (!uniqueTitle) {
            currentTitle = getNextUniqueTitle(currentTitle)
        }
    }

    //Make the updates
    window.trackNames[waveformNum] = currentTitle;
    let title = document.getElementById('track-' + waveformNum + '-header');
    title.textContent = currentTitle;

    return currentTitle;

}

// Helper function for updateTrackName that creates the next name
export function getNextUniqueTitle(currentTitle) {
    let newTitle = '';
    if (currentTitle.substring(currentTitle.length - 1) == ')') {
        let doneState = 0;
        let currentIndex = currentTitle.length - 2;
        while (doneState == 0) {
            currentIndex--;
            if (currentIndex <= 0) {
                doneState = -1;
            } else if (currentTitle.substring(currentIndex, currentIndex + 1) == '(') {
                doneState = 1;
            }
        }

        if (doneState == 1 && !isNaN(currentTitle.substring(currentIndex + 1, currentTitle.length - 1))) {
            newTitle = currentTitle.substring(0, currentIndex + 1) + (Number(currentTitle.substring(currentIndex + 1, currentTitle.length - 1)) + 1) + ')';
        } else {
            newTitle = currentTitle + ' (1)';
        }


    } else {
        newTitle = currentTitle + ' (1)';
    }

    return newTitle;
}

// Updates the segment elements, waveform, and segment detials
export function updateSegmentElementsList(elements, updateWaveform, waveformNum) {
    const labelsContainerStr = 'labels-container' + String(waveformNum);
    const annotationContainerStr = 'segment-annotation-container' + String(waveformNum);

    if(updateWaveform) {
        // Clear the old waveform
        globalState.regions[waveformNum].clearRegions()
        globalState.regionType[waveformNum].clear();
        document.getElementById(labelsContainerStr).textContent = "";
        document.getElementById(annotationContainerStr).textContent = "";
    }

    elements.forEach(element => {
        // Add in color for the label
        if(!globalState.labelColors[waveformNum].has(element.label)) {
            globalState.labelColors[waveformNum].set(element.label, {label: element.label, color: getColor(globalState.labelColors[waveformNum].size)});
        }

        if(updateWaveform) {
            // Create new region
            createNewRegion(element, waveformNum, labelsContainerStr, annotationContainerStr);
        }
    });

    if(updateWaveform) {
        // Create all new markers
        createNewMarkers(waveformNum)
    }
    setTimeout(() => updateLabelPositions(waveformNum), 10);
    setTimeout(() => updateSegmentAnnotationPositions(waveformNum), 10);
}

// Updates label positions with the most up to date waveform
export function updateLabelPositions(waveformNum) {
    const waveformStr = 'waveform' + String(waveformNum);
    const inputStr = ".region-label-input" + String(waveformNum);
    document.querySelectorAll(inputStr).forEach((label, index) => {
        let region = globalState.regions[waveformNum].regions.at(index);
        let regionRect = region.element.getBoundingClientRect();
        let waveform = document.getElementById(waveformStr);
        label.style.left = `${regionRect.left - waveform.getBoundingClientRect().left + waveform.offsetLeft}px`;
        label.style.width = `${regionRect.width}px`;
    });
}

// Updates segment annotation positions with the most up to date waveform
export function updateSegmentAnnotationPositions(waveformNum) {
    const waveformStr = 'waveform' + String(waveformNum);
    const inputStr = ".segment-annotation-input" + String(waveformNum);
    document.querySelectorAll(inputStr).forEach((label, index) => {
        let region = globalState.regions[waveformNum].regions.at(index);
        let regionRect = region.element.getBoundingClientRect();
        let waveform = document.getElementById(waveformStr);
        label.style.left = `${regionRect.left - waveform.getBoundingClientRect().left + waveform.offsetLeft}px`;
        label.style.width = `${regionRect.width}px`;
    });
}

// Updates the specified segment elements label value
function updateOneSegmentLabel(segmentElement, value, waveformNum) {
    segmentElement.label = value;
    updateSegmentElementsList(window.segmentData[waveformNum], false, waveformNum);
}

// Updates the specified segment elements label value for all those labels
function updateGroupSegmentLabel(segmentElement, value, waveformNum) {
    let label = segmentElement.label;
    window.segmentData[waveformNum].forEach(element => {
        if(element.label === label) {
            element.label = value;
        }
    });
    updateSegmentElementsList(window.segmentData[waveformNum], false, waveformNum);
}

// Updates the specified segment elements label value for all those labels
function updateAllTrackGroupSegmentLabel(segmentElement, value) {
    let label = segmentElement.label;


    for (let i = 0; i < globalState.wavesurferWaveforms.length; i++) {               
        const waveform = globalState.wavesurferWaveforms[i];
        if(!waveform.getMuted()) {
            console.log(i)
            window.segmentData[i].forEach(element => {
                if(element.label === label) {
                    element.label = value;
                }
            });
            updateSegmentElementsList(window.segmentData[i], false, i);
            updateTrackColors(i);
        }
    }
}

// Gets the next color to be used for segment region
function getColor(length) {
    if(length > 10) {
        return randomColor();
    } else {
        return globalState.defaultColors[length];
    }
}

// Updates the timeline based on the current zoom level
export function updateTimeline(waveformNum) {
    const timeInterval = calculateTimeInterval(globalState.currentZoom, globalState.wavesurferWaveforms[waveformNum].getDuration());
    if(globalState.timelines[waveformNum] != null) {
        globalState.timelines[waveformNum].destroy(); // Remove the old timeline
    }
    globalState.timelines[waveformNum] = TimelinePlugin.create({
        height: 20,
        insertPosition: 'beforebegin',
        timeInterval: timeInterval,
        style: {
          fontSize: '20px',
          color: '#2D5B88',
        }
    });
    globalState.wavesurferWaveforms[waveformNum].registerPlugin(globalState.timelines[waveformNum]);
}

// Determines time interval for given zoom level
function calculateTimeInterval(zoomLevel, duration) {
    let baseInterval;

    // Adjust based on zoom level
    if (zoomLevel > 300) baseInterval = 0.1;
    else if (zoomLevel > 200) baseInterval = 0.25;
    else if (zoomLevel > 150) baseInterval = 0.5;
    else if (zoomLevel > 100) baseInterval = 1;
    else if (zoomLevel > 50) baseInterval = 2;
    else if (zoomLevel > 10) baseInterval = 5;
    else if (zoomLevel > 5) baseInterval = 10;
    else baseInterval = 20;

    // Adjust further based on duration to avoid label crowding
    if (duration > 300 && zoomLevel <= 10) baseInterval *= 2; // Longer waveform, spread labels out more
    if (duration > 600 && zoomLevel <= 10) baseInterval *= 3;
    if (duration > 1200 && zoomLevel <= 10) baseInterval *= 4;

    return baseInterval;
}

// displays the error dialog
export function presentErrorDialog(message) {
    htmlElements.errorDialogMessage.textContent = message;
    htmlElements.errorDialog.showModal();
}

// loads the song in the app
export async function loadSong(filePath) {
    console.log('File path:', filePath);
    let num = setupNextWaveform();
    if(num == -1) return;
    window.songFilePaths[num] = filePath;
    globalState.regions[num].clearRegions();
    try {
        const audioBuffer = await window.api.readFileAsArrayBuffer(filePath);
        await globalState.wavesurferWaveforms[num].loadBlob(new Blob([audioBuffer]));
    } catch (err) {
        console.error("Wavesurfer load failed:", err);
        presentErrorDialog("Unable to load audio file. For best results, use an uncompressed .wav.");
        removeFailedWaveform(num);
        return -1;
    }
    globalState.currentZoom = 10;
    updateTimeline(num);
    return num;
}

function removeFailedWaveform(waveformNum) {
    const labelContainer = document.getElementById("labels-container" + String(waveformNum));
    const waveform = document.getElementById("waveform" + String(waveformNum));
    const annotationContainer = document.getElementById("segment-annotation-container" + String(waveformNum));
    const track = document.getElementById("track" + String(waveformNum));
    const trackContainer = document.getElementById("track-container" + String(waveformNum));

    if (labelContainer) labelContainer.remove();
    if (waveform) waveform.remove();
    if (annotationContainer) annotationContainer.remove();
    if (track) track.remove();
    if (trackContainer) trackContainer.remove();

    window.trackNames[waveformNum] = null;
    if (globalState.wavesurferWaveforms[waveformNum]) {
        globalState.wavesurferWaveforms[waveformNum].setMuted(true);
    }
}

// helper function to create the track title bar
function createTrackTitle(waveformNum) {

    // Create the title-bar div
    let titleBar = document.createElement('div');
    titleBar.classList.add('title-bar');

    // Create the close button
    let closeButton = document.createElement('button');
    closeButton.classList.add('close-button');
    closeButton.setAttribute('id', 'close-track-' + waveformNum);
    //create the x icon
    let closeImage = document.createElement('img');
    closeImage.setAttribute('src', 'resources/icons/xmark.svg');
    closeImage.classList.add('icon');
    closeButton.appendChild(closeImage);

    // add event listener
    closeButton.addEventListener("click", function() {
        // Remove HTML elements
        document.getElementById("labels-container" + String(waveformNum)).remove();
        document.getElementById("waveform" + String(waveformNum)).remove();
        document.getElementById("segment-annotation-container" + String(waveformNum)).remove();
        document.getElementById("track" + String(waveformNum)).remove();
        document.getElementById("track-container" + String(waveformNum)).remove();
        window.trackNames[waveformNum] = null;
        globalState.wavesurferWaveforms[waveformNum].setMuted(true);
    })

    titleBar.appendChild(closeButton);

    // Create the header
    let title = document.createElement('h1');
    title.classList.add('track-title');
    title.classList.add('title');
    title.setAttribute('id', 'track-' + waveformNum + '-header');
    title.textContent = 'Track ' + waveformNum;

    title.addEventListener("click", function() {
        window.currentWaveformNum = waveformNum;
        htmlElements.titleChangeInput.value = window.trackNames[waveformNum];
        htmlElements.titleChangeDialog.showModal();
    })

    titleBar.appendChild(title);

    let resizeButton = document.createElement('button');
    resizeButton.setAttribute('aria-label', 'Resize');
    resizeButton.disabled = true;
    resizeButton.classList.add('hidden');

    titleBar.appendChild(resizeButton);

    return(titleBar);
}

// helper function to create the segment button
function createSegmentButton(waveformNum) {
    const segmentButton = document.createElement("button");
    segmentButton.classList.add("btn");
    segmentButton.classList.add("segment-button");
    segmentButton.id = "segment-button" + String(waveformNum);
    // segmentButton.textContent = "Segment";

    // set the segment icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/segment.svg";
    img.alt = "Segment Button";
    img.style.setProperty("height", iconSize)
    img.style.setProperty("width", iconSize)
    segmentButton.appendChild(img);


    /* <i style="display: none" class="fa fa-circle-o-notch fa-spin"></i> */

    // add the loading icon
    let loadingIcon = document.createElement("i");
    loadingIcon.classList.add("fa-circle-o-notch");
    loadingIcon.classList.add("fa");
    loadingIcon.classList.add("fa-spin");
    loadingIcon.style.setProperty("display", "none");
    segmentButton.appendChild(loadingIcon);

    return segmentButton;
}

// helper function creates button and adds event listener for each track
function createSegmentDropdownButton(waveformNum, segmentButton) {
    // Create dropdown container
        const dropdown = document.createElement("div");
        dropdown.classList.add("dropdown");
        dropdown.classList.add("segment-button-dropdown");
        dropdown.id = "algorithms-dropdown" + String(waveformNum);

        // Create button
        const algoButton = document.createElement("button");
        algoButton.classList.add("btn");
        algoButton.classList.add("track-button")
        algoButton.classList.add("segment-dropdown-button")
        algoButton.id = "algorithms-dropdown-button" + String(waveformNum);
        // algoButton.textContent = "Algorithms";

        // set the icon inside
        const img = document.createElement("img");
        img.src = "resources/icons/TrackButtons/dropdownArrow.svg";
        img.alt = "Segment Dropdown Button";
        img.style.setProperty("height", iconSize)
        img.style.setProperty("width", iconSize)
        algoButton.appendChild(img);

        // Create dropdown content container
        const dropdownContent = document.createElement("div");
        dropdownContent.classList.add("dropdown-content");
        dropdownContent.id = "algorithms-dropdown-content";

        document.body.appendChild(dropdownContent);

        function showDropdown() {
            const rect = algoButton.getBoundingClientRect();
            dropdownContent.style.position = "absolute";
            dropdownContent.style.left = `${rect.left}px`;
            dropdownContent.style.top = `${rect.bottom}px`;
            dropdownContent.style.display = "block";
        }

        function hideDropdown(event) {
            // Ensure dropdown only hides when cursor leaves both button & menu
            if (!algoButton.contains(event.relatedTarget) && !dropdownContent.contains(event.relatedTarget)) {
                dropdownContent.style.display = "none";
            }
        }

        algoButton.addEventListener("mouseenter", showDropdown);
        algoButton.addEventListener("mouseleave", hideDropdown);
        dropdownContent.addEventListener("mouseleave", hideDropdown);
        dropdownContent.addEventListener("mouseenter", showDropdown);

        // Create and append links for each algorithm
        const algorithm1 = document.createElement("a");
        algorithm1.href = "#";
        algorithm1.id = "segment-algorithm1";
        algorithm1.textContent = "CQT Feat. Ext. and Agglomerative Cluster";
        dropdownContent.appendChild(algorithm1);
        algorithm1.addEventListener("click", async () => {
            LoadingState(segmentButton);
            await externalSegment(1, waveformNum);
            ResetButtonContent(segmentButton);
        });

        const algorithm2 = document.createElement("a");
        algorithm2.href = "#";
        algorithm2.id = "segment-algorithm2";
        algorithm2.textContent = "Mel Spectrogram Feat. Ext. and K-Means Cluster";
        dropdownContent.appendChild(algorithm2);
        algorithm2.addEventListener("click", async () => {
            LoadingState(segmentButton);
            await externalSegment(2, waveformNum);
            ResetButtonContent(segmentButton);
        });

        const algorithm3 = document.createElement("a");
        algorithm3.href = "#";
        algorithm3.id = "segment-algorithm3";
        algorithm3.textContent = "CQT Feat. Ext. and GMM Cluster";
        dropdownContent.appendChild(algorithm3);
        algorithm3.addEventListener("click", async () => {
            LoadingState(segmentButton);
            await externalSegment(3, waveformNum);
            ResetButtonContent(segmentButton);
        });

        const algorithm4 = document.createElement("a");
        algorithm4.href = "#";
        algorithm4.id = "segment-algorithm4";
        algorithm4.textContent = "Chroma STFT Feat. Ext. and K-Means Cluster";
        dropdownContent.appendChild(algorithm4);
        algorithm4.addEventListener("click", async () => {
            LoadingState(segmentButton);
            await externalSegment(4, waveformNum);
            ResetButtonContent(segmentButton);
        });

        const algorithmAuto = document.createElement("a");
        algorithmAuto.href = "#";
        algorithmAuto.id = "auto-segment";
        algorithmAuto.textContent = "Auto Segment";
        dropdownContent.appendChild(algorithmAuto);
        algorithmAuto.addEventListener("click", async () => {
            LoadingState(segmentButton);
            await externalAutoSegment(4, 4, 0, false, waveformNum);
            ResetButtonContent(segmentButton);
        });

        // Append button and dropdown content to dropdown container
        dropdown.appendChild(algoButton);
        return(dropdown);
}

// helper function creates the dial to control the number of clusters
function createClusterDial(waveformNum) {
    const clusterDial = document.createElement("input");
    clusterDial.type = "number";
    // clusterDial.classList.add("btn");
    clusterDial.classList.add("cluster-dial");
    clusterDial.id = "cluster-dial" + String(waveformNum);

    // constraints and placeholders
    clusterDial.min = 1;
    clusterDial.max = 99;
    clusterDial.value = 4;


    /*
    // set the icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/segment.svg";
    img.alt = "Segment Button";
    img.style.setProperty("height", iconSize);
    img.style.setProperty("width", iconSize);
    clusterDial.appendChild(img);
    */

    return clusterDial;
}

// helper function to create the segment button
function createBoundaryButton(waveformNum) {
    const boundaryButton = document.createElement("button");
    boundaryButton.classList.add("btn");
    boundaryButton.classList.add("boundary-button");
    boundaryButton.id = "boundary-button" + String(waveformNum);
    // boundaryButton.textContent = "Boundary";

    // set the icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/flagMarker.svg";
    img.alt = "Boundary Button";
    img.style.setProperty("height", iconSize)
    img.style.setProperty("width", iconSize)
    boundaryButton.appendChild(img);

    // !!! need event listener still

    return boundaryButton;
}

// helper function creates button and adds event listener for each track
function createBoundaryDropdownButton(waveformNum) {
    // Create dropdown container
    const dropdown = document.createElement("div");
    dropdown.classList.add("dropdown");
    dropdown.classList.add("boundary-button-dropdown");
    dropdown.id = "boundary-dropdown" + String(waveformNum);

    // Create button
    const button = document.createElement("button");
    button.classList.add("btn");
    button.classList.add("track-button");
    button.classList.add("boundary-dropdown-button");
    button.id = "boundary-dropdown-button" + String(waveformNum);
    // button.textContent = "Boundary";

    // set the icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/dropdownArrow.svg";
    img.alt = "Boundary dropdown Button";
    img.style.setProperty("height", iconSize)
    img.style.setProperty("width", iconSize)
    button.appendChild(img);

    // Create dropdown content container
    const dropdownContent = document.createElement("div");
    dropdownContent.classList.add("dropdown-content");
    dropdownContent.id = "boundary-dropdown-content";

    document.body.appendChild(dropdownContent);

    function showDropdown() {
        const rect = button.getBoundingClientRect();
        dropdownContent.style.position = "absolute";
        dropdownContent.style.left = `${rect.left}px`;
        dropdownContent.style.top = `${rect.bottom}px`;
        dropdownContent.style.display = "block";
    }

    function hideDropdown(event) {
        // Ensure dropdown only hides when cursor leaves both button & menu
        if (!button.contains(event.relatedTarget) && !dropdownContent.contains(event.relatedTarget)) {
            dropdownContent.style.display = "none";
        }
    }

    button.addEventListener("mouseenter", showDropdown);
    button.addEventListener("mouseleave", hideDropdown);
    dropdownContent.addEventListener("mouseleave", hideDropdown);
    dropdownContent.addEventListener("mouseenter", showDropdown);

    const link1 = document.createElement("a");
    link1.href = "#";
    link1.id = "add-boundary";
    link1.textContent = "Add Boundary";
    dropdownContent.appendChild(link1);
    link1.addEventListener("click", () => {externalAddBoundary(waveformNum)});

    const link2 = document.createElement("a");
    link2.href = "#";
    link2.id = "remove-boundary";
    link2.textContent = "Remove Boundary";
    dropdownContent.appendChild(link2);
    link2.addEventListener("click", () => {externalRemoveBoundary(waveformNum)});
    
    const link4 = document.createElement("a");
    link4.href = "#";
    link4.id = "add-marker";
    link4.textContent = "Add Marker";
    dropdownContent.appendChild(link4);
    link4.addEventListener("click", () => {externalAddMarker(waveformNum)});

    // Append button and dropdown content to dropdown container
    dropdown.appendChild(button);
    return dropdown;
}

// helper function creates button for save system and adds event listener for each track
function createSaveTrackButton(waveformNum) {
    /* making saving and exporting two different buttons instead of dropdown
    // Create dropdown container
    const dropdown = document.createElement("div");
    dropdown.classList.add("dropdown");
    dropdown.id = "save-track-dropdown";
    */

    // Create button
    const button = document.createElement("button");
    button.classList.add("btn");
    button.classList.add("save-track-button");
    button.id = "save-track-button" + String(waveformNum);
    // button.textContent = "Saving and Exporting";


    // set the icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/save.svg";
    img.alt = "Play Button";
    img.style.setProperty("height", iconSize)
    img.style.setProperty("width", iconSize)
    button.appendChild(img);

    button.addEventListener("click", () => {externalSaveTrack(waveformNum)});

    return button;
}


// helper function creates button for export system and adds event listener for each track
function createExportTrackButton(waveformNum) {

    // Create button
    const button = document.createElement("button");
    button.classList.add("btn");
    button.classList.add("export-track-button");
    button.id = "export-track-button" + String(waveformNum);
    // button.textContent = "Saving and Exporting";

    // set the icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/export.svg";
    img.alt = "Play Button";
    img.style.setProperty("height", iconSize)
    img.style.setProperty("width", iconSize)
    button.appendChild(img);

    button.addEventListener("click", () => {externalExportData(waveformNum)});

    return button;
}


// helper function creates button and adds event listener for each track
function createSegmentDetailsButton(waveformNum) {
    
    const button = document.createElement("button");
    // button.textContent = "Details";
    button.classList.add("btn");
    button.classList.add("track-button");
    button.classList.add("segment-details-button");
    button.id = "segment-details-button" + String(waveformNum);


    // set the icon inside
    const img = document.createElement("img");
    img.src = "resources/icons/TrackButtons/info.svg";
    img.alt = "Play Button";
    img.style.setProperty("height", iconSize)
    img.style.setProperty("width", iconSize)
    button.appendChild(img);

    // add event listener
    button.addEventListener("click", function() {
        const tbody = document.getElementById('segment-elements');
        tbody.innerHTML = ''
    
        window.segmentData[waveformNum].forEach(element => {
            let tr = document.createElement('tr');
            for (let key in element) {
                let td = document.createElement('td');
                if (key == 'start' || key == 'end') {
                    td.textContent = Math.round(Number(element[key]) * 100) / 100;
                } else {
                    td.textContent = element[key]
                }
                tr.appendChild(td)
            }
            tbody.appendChild(tr);
        });

        htmlElements.segmentDetailsDialog.showModal();
    })

    return(button);
}


// Create delete track button for the track
function createDeleteTrackButton(waveformNum) { //CURRENTLY UNUSED
    const button = document.createElement("button");
    button.id = "delete-track" + String(waveformNum);
    button.textContent = "Delete Track";
    button.classList.add("btn");
    button.classList.add("track-button");
    button.classList.add("detele-track-button")

    // add event listener
    button.addEventListener("click", function() {
        // Remove HTML elements
        document.getElementById("labels-container" + String(waveformNum)).remove();
        document.getElementById("waveform" + String(waveformNum)).remove();
        document.getElementById("segment-annotation-container" + String(waveformNum)).remove();
        document.getElementById("track" + String(waveformNum)).remove();
    })

    return button;
}

// Creates play button for track
function createPlayButton(waveformNum) {
    const playButton = document.createElement("button");
    playButton.classList.add("btn");
    playButton.classList.add("play-button");
    playButton.id = "play" + String(waveformNum);
    
    // import the play icon
    const img = document.createElement("img");
    img.src = "resources/icons/play-solid.svg";
    img.alt = "Play Button";

    // swap the play and pause icon accordingly
    playButton.appendChild(img);
    playButton.onclick = () => {
        if(globalState.wavesurferWaveforms[waveformNum].getDuration() > 0) {
            globalState.wavesurferWaveforms[waveformNum].playPause()
            if(globalState.wavesurferWaveforms[waveformNum].isPlaying()) {
                // pause icon
                playButton.innerHTML = '<img src="resources/icons/pause-solid.svg" alt="Pause Button">';
            } else {
                // play icon
                playButton.innerHTML = '<img src="resources/icons/play-solid.svg" alt="Play Button">';
            }
        }
    }

    return playButton;
}

// Creates forward button for track
function createForwardButton(waveformNum) {
    const forwardButton = document.createElement("button");
    forwardButton.classList.add("btn");
    forwardButton.classList.add("forward-button");
    forwardButton.id = "forward" +String(waveformNum);

    // import icon
    const img = document.createElement("img");
    img.src = "resources/icons/forward15-seconds.svg";
    img.alt = "Play Button";

    forwardButton.appendChild(img);
    forwardButton.onclick = () => {
        globalState.wavesurferWaveforms[waveformNum].skip(15)
    }
    return forwardButton;
}

// Creates backward button for track
function createBackwardButton(waveformNum) {
    const backwardButton = document.createElement("button");
    backwardButton.classList.add("btn");
    backwardButton.classList.add("backward-button");
    backwardButton.id = "backward-button" + String(waveformNum);



    const img = document.createElement("img");
    img.src = "resources/icons/backward15-seconds.svg";
    img.alt = "Play Button";

    backwardButton.appendChild(img);
    backwardButton.onclick = () => {
        globalState.wavesurferWaveforms[waveformNum].skip(-15)
    }
    return backwardButton;
}


// helper function that creates and styles container that holds the track buttons for tranport control
function createDropdownsContainer(waveformNum) {
    const dropdownsDiv = document.createElement("div");
    dropdownsDiv.id = "dropdownContainer" + String(waveformNum);
    dropdownsDiv.classList.add("dropdown-con");

    return dropdownsDiv;
}

// helper function that creates and styles container that holds the Save, Export, and Details buttons (SED)
function createSEDContainer(waveformNum) {
    const SEDDiv = document.createElement("div");
    SEDDiv.classList.add("save-export-details-con");
    SEDDiv.id = "save-export-details-container" + String(waveformNum);

    return SEDDiv;
}

// helper function that creates and styles container that holds the track buttons for tranport control
function createTransportControlsContainer(waveformNum) {
    const TransportControlDiv = document.createElement("div");
    TransportControlDiv.classList.add("transport-controls-con");
    TransportControlDiv.id = "transportControlContainer" + String(waveformNum);

    return TransportControlDiv;
}


// helper function that creates and styles container that holds 
// the segment and segment dropdown buttons together as 1
function createSegmentComboContainer(waveformNum) {
    const container = document.createElement("div");
    container.classList.add("segment-combo-con");
    container.id = "segmentComboContainer" + String(waveformNum);
    return container
}

// helper function that creates and styles container that holds 
// the boundary and boundary dropdown buttons together as 1
function createBoundaryComboContainer(waveformNum) {
    const container = document.createElement("div");
    container.classList.add("boundary-combo-con");
    container.id = "boundaryComboContainer" + String(waveformNum);
    return container
}


// function that creates the next tracks as new waveforms are being added
function NewTrack(waveformNum) {
    // Create a new div element to be track
    const trackDiv = document.createElement("div");
    trackDiv.id = "track" + String(waveformNum);
    trackDiv.classList.add("trackers");

    // make the title bar
    let titleBar = createTrackTitle(waveformNum);
    let titleBarSeparator = document.createElement("div");
    titleBarSeparator.classList.add("separator");

    // make the buttons
    let segment = createSegmentButton(waveformNum);
    let algDropdown = createSegmentDropdownButton(waveformNum, segment);
    let clusterDial = createClusterDial(waveformNum);
    let boundary = createBoundaryButton(waveformNum);
    let boundaryDropdown = createBoundaryDropdownButton(waveformNum);
    let saveTrackDropdown = createSaveTrackButton(waveformNum);
    let exportTrackDropdown = createExportTrackButton(waveformNum);
    let segmentDetailsButton = createSegmentDetailsButton(waveformNum);
    // let deleteTrackButton = createDeleteTrackButton(waveformNum);
    let playButton = createPlayButton(waveformNum);
    let forwardButton = createForwardButton(waveformNum);
    let backwardButton = createBackwardButton(waveformNum);

    // make the containers for each row of buttons
    let dropdownsCon = createDropdownsContainer(waveformNum)
    let saveExportDetailsCon = createSEDContainer(waveformNum)
    let transportControlsCon = createTransportControlsContainer(waveformNum)

    // make the containers for the dropdown combos
    let segmentCombo = createSegmentComboContainer(waveformNum)
    let boundaryCombo = createBoundaryComboContainer(waveformNum)

    // // Make little line separators for the interior of conjoined buttons
    // let interiorSeparator = document.createElement("div")
    // interiorSeparator.classList.add("interior-separator")

    // add title bar
    trackDiv.appendChild(titleBar);
    trackDiv.appendChild(titleBarSeparator);

    // add alg and bound dropdowns
    trackDiv.appendChild(dropdownsCon);
    dropdownsCon.appendChild(segmentCombo);
    segmentCombo.appendChild(segment);
    segmentCombo.appendChild(algDropdown);
    segmentCombo.appendChild(clusterDial);


    dropdownsCon.appendChild(boundaryCombo)
    boundaryCombo.appendChild(boundary);
    boundaryCombo.appendChild(boundaryDropdown);


    // add save, export, and details
    trackDiv.appendChild(saveExportDetailsCon);
    saveExportDetailsCon.appendChild(saveTrackDropdown);
    saveExportDetailsCon.appendChild(exportTrackDropdown);
    saveExportDetailsCon.appendChild(segmentDetailsButton);
    // trackDiv.appendChild(deleteTrackButton);

    // add transport controls
    trackDiv.appendChild(transportControlsCon);
    transportControlsCon.appendChild(backwardButton);
    transportControlsCon.appendChild(playButton);
    transportControlsCon.appendChild(forwardButton);

    // Append the div to the body (or any other container)
    document.getElementById("tracks").appendChild(trackDiv);
}


// Gets the next available waveform
export function setupNextWaveform() {
    // Create div elements for label, waveform, segment annotations
    externalLoadColorPreferences();
    let waveformNum = 0;
    if(globalState.waveformNums.length == 0) {
        globalState.waveformNums.push(0);
    } else {
        waveformNum = globalState.waveformNums[globalState.waveformNums.length - 1] + 1;
        globalState.waveformNums.push(waveformNum);
    }

    // calls out to make a new track alongside the new waveform
    NewTrack(waveformNum);

    // Setup necessary variables
    setupWaveformTrackVariables(waveformNum);

    // Set up scroll for wavesurfer
    setupScroll(waveformNum);

    // Update labels and timeline on zoom
    setupZoom(waveformNum);

    // Handle region update for editing boundaries
    setupRegionUpdate(waveformNum);

    return waveformNum;
}


// Get previous region that is not a marker
function getPrevRegion(waveformNum, index) {
    index--;
    let region = globalState.regions[waveformNum].regions.at(index);
    while(globalState.regionType[waveformNum].get(region) === 'marker') {
        index--;
        if(index < 0) return null;
        region = globalState.regions[waveformNum].regions.at(index);
    }
    if(index < 0) return null;
    return region;
}

// Get next region that is not a marker
function getNextRegion(waveformNum, index) {
    let region = globalState.regions[waveformNum].regions.at(index + 1);
    while(globalState.regionType[waveformNum].get(region) === 'marker') {
        index++;
        if(index > globalState.regions[waveformNum].regions.length-1) return null;
        region = globalState.regions[waveformNum].regions.at(index + 1);
    }
    if(index > globalState.regions[waveformNum].regions.length-1) return null;
    return region;
}

// Updates the specified track colors based on color preferences metadata
export function updateTrackColors(waveformNum) {
    globalState.labelColors[waveformNum].forEach(entry => {
        if(globalState.colorLegendMap.has(entry.label)) {
            globalState.labelColors[waveformNum].set(entry.label, globalState.colorLegendMap.get(entry.label));
        }
    });
    updateSegmentElementsList(window.segmentData[waveformNum], true, waveformNum);
}

// Creates all the elements required for a new region
function createNewRegion(element, waveformNum, labelsContainerStr, annotationContainerStr) {
    let region = globalState.regions[waveformNum].addRegion({
        start: element.start,
        end: element.end,
        color: globalState.labelColors[waveformNum].get(element.label).color,
        drag: false,
        resize: false,
        height: globalState.segmentAnnotationsPresent ? 113 : 163,
    });

    globalState.regionType[waveformNum].set(region, 'segment');

    // Create segment label for region
    let labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = element.label;
    labelInput.className = "region-label-input" + String(waveformNum);
    labelInput.style.backgroundColor = globalState.labelColors[waveformNum].get(element.label).color;

    let handledByKeydown = false;

    function handleLabelInput(event) {
        if (event.type === "keydown") {
            // Deal with escape
            if(event.key === "Escape") {
                event.target.value = element.label;
                labelInput.blur();
                return;
            }

            // Deal with enter
            if(event.key !== "Enter") return;
            handledByKeydown = true;
        } 

        // Deal with click out
        if(event.type === "blur" && handledByKeydown) {
            handledByKeydown = false;
            return;
        }

        if(globalState.groupEditingMode === 1) {
            updateGroupSegmentLabel(element, event.target.value, waveformNum);
            updateTrackColors(waveformNum);
        } else if(globalState.groupEditingMode === 0) {
            updateOneSegmentLabel(element, event.target.value, waveformNum);
            updateTrackColors(waveformNum);
        } else {
            updateAllTrackGroupSegmentLabel(element, event.target.value);   
        }      
    }

    labelInput.addEventListener("blur", handleLabelInput);
    labelInput.addEventListener("keydown", handleLabelInput);
    
    labelInput.addEventListener("input", function(event) {
        this.value = this.value.replace(/,/g, "");
    });
    document.getElementById(labelsContainerStr).appendChild(labelInput);

    // Sync text input value with region data
    labelInput.addEventListener("input", () => {
        region.data = region.data || {}; 
        region.data.label = labelInput.value;
    });

    // Create segment annotation box for region
    let annotationInput = document.createElement("textarea");
    annotationInput.value = element.annotation;
    annotationInput.className = "segment-annotation-input" + String(waveformNum);
    annotationInput.addEventListener("blur", (event) => {
        element.annotation = event.target.value;
    });
    annotationInput.addEventListener("input", function(event) {
        this.value = this.value.replace(/,/g, "");
    });
    document.getElementById(annotationContainerStr).appendChild(annotationInput);

    // Listen for right-click (contextmenu event)
    region.element.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent default browser menu

        let selectedBox = null;
        let selectedColor = region.color;
        let selectedLabel = element.label;
        let labels = document.getElementById(labelsContainerStr).children;

        // Add in color boxes
        htmlElements.colorContainer.textContent = '';
        globalState.defaultColors.forEach(color => {
            const box = document.createElement('div');
            box.classList.add('color-box');
            box.style.backgroundColor = color;

            // set current selection to current color
            if(color === selectedColor) {
                box.classList.add('selected');
                selectedBox = box;
            }
    
            // update color when new color box is clicked
            box.addEventListener('click', () => {
                if (selectedBox) {
                    selectedBox.classList.remove('selected');
                }
                box.classList.add('selected');
                selectedBox = box;
                selectedColor = box.style.backgroundColor;

                globalState.labelColors[waveformNum].set(element.label, {label: element.label, color: selectedColor});

                // update all segments with the selected label
                for(let i = 0; i < elements.length; i++) {
                    let tempElement = elements[i];
                    let tempRegion = globalState.regions[waveformNum].regions[i];
                    let tempLabel = labels[i];
                    if(tempElement.label === selectedLabel) {
                        tempRegion.color = selectedColor;
                        tempRegion.element.style.backgroundColor = selectedColor;
                        tempLabel.style.backgroundColor = selectedColor;
                    }
                }
                updateTrackColors(waveformNum); 
            });
    
            htmlElements.colorContainer.appendChild(box);
        });

        htmlElements.colorDialog.showModal();
    });

    // Update position when region is moved/resized
    region.on("update-end", () => updateLabelPositions(waveformNum));
    region.on("update-end", () => updateSegmentAnnotationPositions(waveformNum));
}

// Creates all the elements required for each new marker
function createNewMarkers(waveformNum) {
    globalState.markerNotes[waveformNum].keys().forEach(element => {
        // Add marker at time
        const marker = globalState.regions[waveformNum].addRegion({
            start: element,
            content: "",
            color: "rgba(255, 0, 0, 0.5)",
            drag: false,
            resize: false,
        });
        marker.element.style.minWidth = "6px";
        marker.element.style.backgroundColor = "rgba(255, 0, 0)";

        // Create a flag element
        const flag = document.createElement("div");
        flag.innerText = "🔻";
        flag.style.position = "absolute";
        flag.style.top = "0";
        flag.style.left = "50%";
        flag.style.transform = "translateX(-50%)";
        flag.style.fontSize = "14px";
        flag.style.backgroundColor = "rgba(255, 0, 0)";
        flag.style.padding = "2px 4px";
        flag.style.zIndex = "10";

        // Append the flag to the marker
        marker.element.appendChild(flag);
    
        globalState.regionType[waveformNum].set(marker, 'marker');
    
        marker.element.addEventListener('mouseenter', () => {
            marker.element.style.backgroundColor = "rgb(255,197,61)";
            flag.style.backgroundColor = "rgb(255,197,61)";
        });
    
        marker.element.addEventListener('mouseleave', () => {
            marker.element.style.backgroundColor = "rgba(255, 0, 0)";
            flag.style.backgroundColor = "rgba(255, 0, 0)";
        });

        marker.on('click', () => {
            if (externalOpenMarker) {
                externalOpenMarker(marker, globalState.markerNotes[waveformNum], waveformNum);
            } else {
                console.warn("External function not set!");
            }
        });
    });
}

// Setups the zoom for the labels and timeline on the waveform
function setupZoom(waveformNum) {
    globalState.wavesurferWaveforms[waveformNum].on("zoom", async (newPxPerSec) => {
        if(currentlyEditing) return;
        if(globalState.currentZoom === newPxPerSec) return;
        globalState.currentZoom = newPxPerSec;

        if(globalState.globalTimelineMode) {
            currentlyEditing = true;
            for (let i = 0; i < globalState.wavesurferWaveforms.length; i++) {               
                const waveform = globalState.wavesurferWaveforms[i];
                if(!waveform.getMuted()) {
                    waveform.zoom(newPxPerSec);
                    updateLabelPositions(i);
                    updateSegmentAnnotationPositions(i);
                    updateTimeline(i);
                }
            }
            currentlyEditing = false;
        } else {
            updateLabelPositions(waveformNum);
            updateSegmentAnnotationPositions(waveformNum);
            updateTimeline(waveformNum);
        }

        // run update after no more zoom actions have been triggered in 1 second
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
            if(globalState.globalTimelineMode) {
                for (let i = 0; i < globalState.wavesurferWaveforms.length; i++) {
                    const waveform = globalState.wavesurferWaveforms[i];
                    if(!waveform.getMuted()) {
                        updateSegmentElementsList(window.segmentData[i], true, i);  
                    }
                }
            } else {
                updateSegmentElementsList(window.segmentData[waveformNum], true, waveformNum);
            }
            
        }, 1000);
    });
}

// Handle region update for editing boundaries
function setupRegionUpdate(waveformNum) {
    globalState.regions[waveformNum].on('region-updated', (region) => {
        if(globalState.regionType[waveformNum].get(region) === 'marker') return;
        if (!globalState.editBoundaryMode) return;

        let index = globalState.regions[waveformNum].regions.findIndex(r => r.id === region.id);
        if (index === -1) return;

        let movedStart = window.segmentData[waveformNum][index].start !== region.start;

        let prevRegion = getPrevRegion(waveformNum, index);
        let nextRegion = getNextRegion(waveformNum, index);

        // Enforce limits so you can't go before previous or after next segment
        let minStart = prevRegion ? prevRegion.start : 0; // Can't move before previous start
        let maxEnd = nextRegion ? nextRegion.end : globalState.wavesurferWaveforms[waveformNum].getDuration(); // Can't extend beyond next region

        let newStart = Math.max(region.start, minStart);
        let newEnd = Math.min(region.end, maxEnd);

        // Apply the constraints
        region.setOptions({ start: newStart, end: newEnd });

        // Adjust adjacent regions to stay connected
        if (nextRegion) nextRegion.setOptions({ start: newEnd });
        if (prevRegion) prevRegion.setOptions({ end: newStart });

        // Update segment data
        if(movedStart) {
            // Update start of current
            window.segmentData[waveformNum][index].start = newStart;
            // Update end of prev
            if(index > 0)
                window.segmentData[waveformNum][index-1].end = newStart;
        } else {
            // Update end of current
            window.segmentData[waveformNum][index].end = newEnd;
            // Update start of next
            if(index+1 < window.segmentData[waveformNum].length)
                window.segmentData[waveformNum][index+1].start = newEnd;
        }

        updateSegmentElementsList(window.segmentData[waveformNum], false, waveformNum);
    });
}

// Set up scroll and zoom for wavesurfer
function setupScroll(waveformNum) {
    globalState.wavesurferWaveforms[waveformNum].on("scroll", () => {
        if(currentlyEditing) return;
        const currentScroll = globalState.wavesurferWaveforms[waveformNum].getScroll();

        if(globalState.globalTimelineMode) {
            currentlyEditing = true;
            for (let i = 0; i < globalState.wavesurferWaveforms.length; i++) {               
                const waveform = globalState.wavesurferWaveforms[i];
                if(waveform.getDuration() > 0) {
                    waveform.setScroll(currentScroll);
                    updateLabelPositions(i);
                    updateSegmentAnnotationPositions(i);
                }
            }
            currentlyEditing = false;
        } else {
            updateLabelPositions(waveformNum);
            updateSegmentAnnotationPositions(waveformNum);
        }
    });
}

// Sets up all the necessary variables for a new waveform and track
function setupWaveformTrackVariables(waveformNum) {
    let trackContainer = document.createElement("div");
    trackContainer.className = "track-container";
    trackContainer.id = "track-container" + String(waveformNum);

    let labelsContainer = document.createElement("div");
    labelsContainer.className = "labels-container";
    labelsContainer.id = "labels-container" + String(waveformNum);
    let waveform = document.createElement("div");
    waveform.className = "waveform";
    waveform.id = "waveform" + String(waveformNum);
    let segmentAnnotationContainer = document.createElement("div");
    segmentAnnotationContainer.className = "segment-annotation-container";
    segmentAnnotationContainer.id = "segment-annotation-container" + String(waveformNum);
    trackContainer.appendChild(labelsContainer);
    trackContainer.appendChild(waveform);
    trackContainer.appendChild(segmentAnnotationContainer);

    htmlElements.timeline.appendChild(trackContainer);

    // Add necessary elements to global variables
    window.songFilePaths.push('');
    window.segmentData.push([]);
    window.clusters.push(0);
    globalState.regions.push(RegionsPlugin.create());
    globalState.timelines.push(null);
    globalState.wavesurferWaveforms.push(WaveSurfer.create({
        container: "#waveform" + String(waveformNum),
        waveColor: 'rgb(92, 92, 92)',
        progressColor: 'rgb(5, 5, 5)',
        minPxPerSec: 1,
        plugins: [globalState.regions[waveformNum], ZoomPlugin.create({scale:0.1})],
        height: globalState.segmentAnnotationsPresent ? 113 : 163,
    }));
    globalState.markerNotes.push(new Map());
    globalState.regionType.push(new Map());
    globalState.labelColors.push(new Map());

    // Reset edit mode
    globalState.editBoundaryMode = false;
    htmlElements.modifyBoundariesButton.style.backgroundColor = "white";
    for(let i = 0; i < globalState.regions.length; i++) {
        globalState.regions[i].regions.forEach(element => {
            if(globalState.regionType[i].get(element) === 'segment') {
                element.setOptions({
                    resize: globalState.editBoundaryMode
                });
            }
        });
    }

    // Enable segment annotations on waveform if true
    if(globalState.segmentAnnotationsPresent) {
        htmlElements.segmentAnnotationButton.style.backgroundColor = "rgb(255,197,61)";
        document.querySelectorAll(".segment-annotation-container").forEach((container) => {
            container.setAttribute('style', 'height: 50px; visibility: visible;');
        });
    }
}
