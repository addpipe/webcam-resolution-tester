const resolutions = [
  { name: "QQVGA", width: 160, height: 120 },
  { name: "QCIF", width: 176, height: 144 },
  { name: "QVGA", width: 320, height: 240 },
  { name: "CIF", width: 352, height: 288 },
  { name: "360p", width: 640, height: 360 },
  { name: "VGA", width: 640, height: 480 },
  { name: "DVD", width: 720, height: 480 },
  { name: "SVGA", width: 800, height: 600 },
  { name: "XGA", width: 1024, height: 768 },
  { name: "HD", width: 1280, height: 720 },
  { name: "Full HD", width: 1920, height: 1080 },
  { name: "QHD", width: 2560, height: 1440 },
  { name: "4K UHD", width: 3840, height: 2160 },
];

let currentStream;
let currentDeviceId;
let currentDevices;
let browserFullVersion;
let isPortrait = false;
let scanAll = false;

const log = (text) => {
  const formattedLog = `${new Date().toISOString().split("T")[1]} - ${text}`;
  console.log(formattedLog);
  const newLog = document.createElement("p");
  newLog.innerHTML = `<span>${new Date().toISOString().split("T")[1]}</span> ${text} <hr/>`;
  document.getElementById("logsWrapper").prepend(newLog);
};

let resTableBody = document.querySelector("#resTable tbody");
function renderTable(data) {
  resTableBody.innerHTML = "";
  data.forEach((res, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
          <td><input required type="text" value="${res.name || ""}" /></td>
          <td><input required type="number" value="${res.width || ""}" /></td>
          <td><input required type="number" value="${res.height || ""}" /></td>
          <td><input required type="checkbox" ${res.exact ? "checked" : ""} /></td>
          <td class="flex-center"><button class="removeRow">Delete</button></td>
        `;

    // Add remove event listener
    row.querySelector(".removeRow").addEventListener("click", () => {
      row.remove();
    });

    resTableBody.appendChild(row);
  });
}

document.getElementById("addRow").addEventListener("click", () => {
  renderTable([...getTableData(), { name: "", width: 0, height: 0, exact: false }]);
});

document.getElementById("resetTable").addEventListener("click", () => {
  renderTable(resolutions);
});

document.getElementById("submitTable").addEventListener("click", () => {
  const data = getTableData();
  startResolutionScan(false, data);
});

function getTableData() {
  return Array.from(resTableBody.children).map((row) => {
    const inputs = row.querySelectorAll("input");
    return {
      name: inputs[0].value.trim(),
      width: parseInt(inputs[1].value),
      height: parseInt(inputs[2].value),
      exact: inputs[3].checked,
    };
  });
}

// Initial load
renderTable(resolutions);

const detectBrowserData = () => {
  let browserAgent = navigator.userAgent;
  let browserName = navigator.appName;
  let browserVersion = "" + parseFloat(navigator.appVersion);
  let browserMajorVersion = parseInt(navigator.appVersion, 10);
  let Offset, OffsetVersion, ix;

  // For Chrome
  if ((OffsetVersion = browserAgent.indexOf("Chrome")) != -1) {
    browserName = "Chrome";
    browserVersion = browserAgent.substring(OffsetVersion + 7);
  }

  // For Microsoft internet explorer
  else if ((OffsetVersion = browserAgent.indexOf("MSIE")) != -1) {
    browserName = "Microsoft Internet Explorer";
    browserVersion = browserAgent.substring(OffsetVersion + 5);
  }

  // For Firefox
  else if ((OffsetVersion = browserAgent.indexOf("Firefox")) != -1) {
    browserName = "Firefox";
    browserVersion = browserAgent.substring(OffsetVersion + 8).split(" ")[0];
  }

  // For Safari
  else if ((OffsetVersion = browserAgent.indexOf("Safari")) != -1) {
    browserName = "Safari";
    browserVersion = browserAgent.substring(OffsetVersion + 7);
    if ((OffsetVersion = browserAgent.indexOf("Version")) != -1) browserVersion = browserAgent.substring(OffsetVersion + 8);
  }

  // For other browser "name/version" is at the end of userAgent
  else if ((Offset = browserAgent.lastIndexOf(" ") + 1) < (OffsetVersion = browserAgent.lastIndexOf("/"))) {
    browserName = browserAgent.substring(Offset, OffsetVersion);
    browserVersion = browserAgent.substring(OffsetVersion + 1);
    if (browserName.toLowerCase() == browserName.toUpperCase()) {
      browserName = navigator.appName;
    }
  }

  // Trimming the fullVersion string at
  // semicolon/space if present
  if ((ix = browserVersion.indexOf(";")) != -1) browserVersion = browserVersion.substring(0, ix);
  if ((ix = browserVersion.indexOf(" ")) != -1) browserVersion = browserVersion.substring(0, ix);

  browserMajorVersion = parseInt("" + browserVersion, 10);
  if (isNaN(browserMajorVersion)) {
    browserVersion = "" + parseFloat(navigator.appVersion);
    browserMajorVersion = parseInt(navigator.appVersion, 10);
  }

  browserFullVersion = `${browserName} ${browserMajorVersion}`;
};

async function getVideoDevices(resetStream = true) {
  currentDevices = new Map();
  if (resetStream) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");
  if (!videoDevices || videoDevices.length === 0) {
    alert("No video devices available");
  }
  const select = document.getElementById("videoSource");
  select.innerHTML = "";
  videoDevices.forEach((device) => {
    currentDevices.set(device.deviceId, { deviceName: device.label || `Camera ${select.length + 1}` });
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label || `Camera ${select.length + 1}`;
    select.appendChild(option);
  });
  // Add an "Scan All" button
  const option = document.createElement("option");
  option.value = "all";
  option.text = "Scan All";
  select.appendChild(option);

  detectBrowserData(); // Scan for browser version

  return videoDevices;
}

async function startStream(deviceId, constraints = { video: true }) {
  if (currentStream) currentStream.getTracks().forEach((track) => track.stop());
  log(`Starting stream from device with ID "${deviceId}" with the following constraints: ${JSON.stringify(constraints || {})}`);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: Object.assign({}, constraints.video, { deviceId: { exact: deviceId } }),
    });
    const videoFeedSection = document.getElementById("videoFeedSection");
    videoFeedSection.style.display = "flex";
    document.getElementById("video").srcObject = stream;
    currentStream = stream;
    currentDeviceId = deviceId;
    const [track] = stream.getVideoTracks();
    const settings = track.getSettings();
    const capabilities = track.getCapabilities();
    isPortrait = settings.height > settings.width;
    const aspectRatio = (settings.width / settings.height).toFixed(2);

    // Only update the default stream properties if it has a simple video: true constraint
    if (constraints.video === true) {
      // Default
      document.getElementById("defaultCameraSettings").innerText = `Default stream properties: ${settings.width}x${settings.height} • ${getAspectLabelAlgo(settings.width, settings.height)} • ${Math.floor(settings.frameRate)} FPS`;
      document.getElementById("currentCameraSettings").innerText = "";
    } else {
      // Custom
      document.getElementById("currentCameraSettings").innerText = `Current stream properties: ${settings.width}x${settings.height} • ${getAspectLabelAlgo(settings.width, settings.height)} • ${Math.floor(settings.frameRate)} FPS`;
    }

    document.getElementById("closeWebcam").style.display = "block";

    document.getElementById("capabilitiesSection").style.display = "block";
    document.getElementById("capabilities").textContent = JSON.stringify(capabilities, null, 2);
    document.getElementById("videoSource").value = deviceId;
    log(`Stream stared from device with ID "${deviceId}" with the following video track settings: ${JSON.stringify(settings || {})}`);
    return true;
  } catch (err) {
    console.error("Stream error:", err);
    log(`Error starting stream from device with ID "${deviceId}": Error name: ${err.name || "-"} - Error message: ${err.message} ${err.constraint}`);
    return false;
  }
}

async function scanResolutions(useExact = false, customResolutions = resolutions, clearTable = false, deviceIdToScan = currentDeviceId) {
  return new Promise(async (resolve) => {
    const scanStartTime = new Date().getTime();
    log(`Starting ${useExact ? "EXACT" : ""} resolution scan for device with ID "${deviceIdToScan}"`);
    const resultsTable = document.getElementById("resultsSection");
    resultsTable.style.display = "block";
    const tbody = document.querySelector("#results tbody");
    if (clearTable) tbody.innerHTML = "";
    const progress = document.getElementById("progress");

    // Add the default stream properties line
    const videoElement = document.getElementById("video");
    const [track] = currentStream.getVideoTracks();
    const settings = track.getSettings();
    const defaultRatioLabel = getAspectLabelAlgo(settings.width, settings.height);
    const defaultTr = document.createElement("tr");
    defaultTr.innerHTML = `
          <td>${browserFullVersion || "-"}</td>
          <td>${currentDevices.get(deviceIdToScan).deviceName || "-"}</td>
          <td>Default<br><button class="applyResolution" data-width="${videoElement.videoWidth}" data-height="${videoElement.videoHeight}" data-fps="${Math.floor(settings.frameRate)}">Apply</button></td>
          <td>-</td>
          <td>${settings.width}x${settings.height} (${defaultRatioLabel}) @ ${Math.floor(settings.frameRate)}fps</td>
          <td>-</td>`;
    tbody.appendChild(defaultTr);

    // Swap width with height if portrait orientation
    let localResolutions = customResolutions;
    // if (isPortrait) {
    //   localResolutions = customResolutions.map((res) => ({ name: res.name, width: res.height, height: res.width }));
    // }

    // Kill the stream first
    if (currentStream) currentStream.getTracks().forEach((track) => track.stop());

    for (let i = 0; i < localResolutions.length; i++) {
      const res = localResolutions[i];
      log(`Scanning: ${res.name} (${res.width}x${res.height})... (${i + 1}/${localResolutions.length})`);
      progress.textContent = `Scanning: ${res.name} (${res.width}x${res.height})... (${i + 1}/${localResolutions.length})`;

      let useExactConstraint = useExact || res.exact === true;
      let constraints = {
        video: {
          width: useExactConstraint ? { exact: res.width } : { ideal: res.width },
          height: useExactConstraint ? { exact: res.height } : { ideal: res.height },
          deviceId: { exact: deviceIdToScan },
        },
      };

      try {
        // delete constraints.video.frameRate;
        constraints.video.frameRate = { ideal: 1000 }; // Test max FPS
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Create hidden video element
        const video = document.createElement("video");
        video.style.display = "none";
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);

        // Attach the stream to the video
        video.srcObject = stream;

        // Wait for the metadata to load
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            resolve();
          };
          video.play(); // Start the video to trigger metadata loading
        });

        // Get actual rendered resolution
        const width = video.videoWidth;
        const height = video.videoHeight;

        // Get max FPS from track settings
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        const maxFps = Math.floor(settings.frameRate || 0);

        // Stop stream and cleanup
        if (stream) stream.getTracks().forEach((track) => track.stop());
        video.remove();

        const actualAspectRatio = (width / height).toFixed(2);
        const actualRatioLabel = getAspectLabelAlgo(width, height);

        const aspectRatio = (localResolutions[i].width / localResolutions[i].height).toFixed(2);
        const ratioLabel = getAspectLabelAlgo(localResolutions[i].width, localResolutions[i].height);

        let result = "FAIL";
        if (res.width === width && res.height === height) {
          result = "PASS";
        } else {
          result = "FALLBACK TO DIFFERENT RESOLUTION";
        }

        log(`Resolution scan for ${res.name} (${res.width}x${res.height}) result: ${width}x${height} - ${result}`);

        const tr = document.createElement("tr");
        tr.innerHTML = `
              <td>${browserFullVersion || "-"}</td>
              <td>${currentDevices.get(deviceIdToScan).deviceName || "-"}</td>
              <td>${res.name}<br><button class="applyResolution" data-width="${res.width}" data-height="${res.height}" data-fps="${maxFps}">Apply</button></td>
              <td><u>${res.width}x${res.height}</u> (${ratioLabel}) @ <u>${maxFps}fps</u></td>
              <td class="${result === "FALLBACK TO DIFFERENT RESOLUTION" ? "orange" : ""}">${width}x${height} (${actualRatioLabel}) @ ${maxFps}fps</td>
              <td class="${result === "FAIL" ? "red" : ""}">${result}</td>`;
        tbody.appendChild(tr);
      } catch (err) {
        log(`Resolution scan for ${res.name} (${res.width}x${res.height}) result: FAIL - Reason: Error name: ${err.name || "-"} - Error message: ${err.message || "-"} `);
        const tr = document.createElement("tr");
        tr.innerHTML = `
              <td>${browserFullVersion || "-"}</td>
              <td>${currentDevices.get(deviceIdToScan).deviceName || "-"}</td>
              <td>${res.name}<br></td>
              <td>${res.width}x${res.height}</td>
              <td>-</td>
              <td class="red">${err.name}</td>`;
        tbody.appendChild(tr);
      }
    }

    const scanDuration = new Date().getTime() - scanStartTime;
    log(`Scan for webcam with ID ${deviceIdToScan} complete. Duration: ${scanDuration / 1000}s`);
    progress.textContent = `Scan complete in ${scanDuration / 1000}s.`;

    // Restart the stream
    startStream(deviceIdToScan);
    resolve();
  });
}

const startResolutionScan = async (useExact = false, customResolutions = resolutions) => {
  if (!scanAll) {
    await scanResolutions(useExact, customResolutions, true);
    return;
  }

  // Scan all available cameras
  const videoDevices = await getVideoDevices(false);
  for (let i = 0; i < videoDevices.length; i++) {
    await scanResolutions(useExact, customResolutions, i === 0, videoDevices[i].deviceId);
    console.log(videoDevices);
    // Devices left
    if (i < videoDevices.length - 1) {
      document.getElementById("progress").innerText = `Preparing scan for ${videoDevices[i].label}...`;
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Artificial timeout to avoid stack errors
    }
  }
};

function getAspectLabelAlgo(w, h) {
  function gcd(a, b) {
    a = Math.round(a);
    b = Math.round(b);
    return b == 0 ? a : gcd(b, a % b);
  }
  const r = gcd(w, h);
  return `${w / r}:${h / r}`;
}

const toggleCustomScanTable = () => {
  document.getElementById("customTableSection").classList.toggle("hide");
};

document.getElementById("scanBtn").addEventListener("click", () => startResolutionScan(false));
document.getElementById("scanExactBtn").addEventListener("click", () => startResolutionScan(true));
document.getElementById("toggleCustomTable").addEventListener("click", toggleCustomScanTable);

const addpipeLink = `\n\nGenerated by  https://addpipe.com/webcam-resolution-tester/`;

const exportCsv = (copy = false) => {
  let currentDeviceName = "";
  if (currentDevices) {
    const currentDevice = currentDevices.get(currentDeviceId);
    currentDeviceName = currentDevice.deviceName || "";
  }
  const rows = Array.from(document.querySelectorAll("#results tr"));
  const csv = rows
    .map((row) =>
      Array.from(row.children)
        .map((cell) => {
          const clonedCell = cell.cloneNode(true);
          clonedCell.querySelectorAll("button").forEach((btn) => btn.remove());
          return `"${clonedCell.textContent.trim()}"`;
        })
        .join(",")
    )
    .join("\n");
  if (copy) {
    navigator.clipboard.writeText(csv + addpipeLink);
    return;
  }
  const blob = new Blob([csv + addpipeLink], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resolution_scan_${currentDeviceName}.csv`;
  a.click();
};

const exportMd = (copy = false) => {
  let currentDeviceName = "";
  if (currentDevices) {
    const currentDevice = currentDevices.get(currentDeviceId);
    currentDeviceName = currentDevice.deviceName || "";
  }
  const rows = Array.from(document.querySelectorAll("#results tr"));
  let md = "";

  rows.forEach((row, i) => {
    const cells = Array.from(row.children).map((cell) => {
      const clonedCell = cell.cloneNode(true);
      clonedCell.querySelectorAll("button").forEach((btn) => btn.remove());
      return `${clonedCell.textContent.trim()}`;
    });
    md += "| " + cells.join(" | ") + " |\n";

    if (i === 0) {
      md += "| " + cells.map(() => "---").join(" | ") + " |\n"; // header divider
    }
  });

  if (copy) {
    navigator.clipboard.writeText(md + addpipeLink);
    return;
  }

  const blob = new Blob([md + addpipeLink], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resolution_scan_${currentDeviceName}.md`;
  a.click();
};

const exportXml = (copy = false) => {
  let currentDeviceName = "";
  if (currentDevices) {
    const currentDevice = currentDevices.get(currentDeviceId);
    currentDeviceName = currentDevice.deviceName || "";
  }
  const rows = Array.from(document.querySelectorAll("#results tr"));
  const headers = Array.from(rows[0].children).map((cell) => {
    const clonedCell = cell.cloneNode(true);
    clonedCell.querySelectorAll("button").forEach((btn) => btn.remove());
    return `${clonedCell.textContent.trim()}`;
  });

  let xml = `<resolutions>\n`;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = Array.from(row.children).map((cell) => {
      const clonedCell = cell.cloneNode(true);
      clonedCell.querySelectorAll("button").forEach((btn) => btn.remove());
      return `${clonedCell.textContent.trim()}`;
    });
    xml += `  <resolution>\n`;
    headers.forEach((header, j) => {
      xml += `    <${header.toLowerCase().replace(/\s+/g, "_")}>${cells[j]}</${header.toLowerCase().replace(/\s+/g, "_")}>\n`;
    });
    xml += `  </resolution>\n`;
  }
  xml += `</resolutions>`;

  if (copy) {
    navigator.clipboard.writeText(xml + addpipeLink);
    return;
  }

  const blob = new Blob([xml + addpipeLink], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resolution_scan_${currentDeviceName}.xml`;
  a.click();
};

const exportJson = (copy = false) => {
  let currentDeviceName = "";
  if (currentDevices) {
    const currentDevice = currentDevices.get(currentDeviceId);
    currentDeviceName = currentDevice.deviceName || "";
  }
  const rows = Array.from(document.querySelectorAll("#results tr"));
  const headers = Array.from(rows[0].children).map((cell) => {
    const clonedCell = cell.cloneNode(true);
    clonedCell.querySelectorAll("button").forEach((btn) => btn.remove());
    return `${clonedCell.textContent.trim()}`;
  });

  const data = rows.slice(1).map((row) => {
    const cells = Array.from(row.children).map((cell) => {
      const clonedCell = cell.cloneNode(true);
      clonedCell.querySelectorAll("button").forEach((btn) => btn.remove());
      return `${clonedCell.textContent.trim()}`;
    });
    return Object.fromEntries(cells.map((v, i) => [headers[i], v]));
  });

  if (copy) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2) + addpipeLink);
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2) + addpipeLink], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resolution_scan_${currentDeviceName}.json`;
  a.click();
};

const exportManager = {
  csv: exportCsv,
  md: exportMd,
  xml: exportXml,
  json: exportJson,
};

document.getElementById("exportResult").addEventListener("click", () => {
  const selectValue = document.getElementById("exportTypes").value;
  exportManager[selectValue]();
});

document.getElementById("copyResult").addEventListener("click", () => {
  const selectValue = document.getElementById("exportTypes").value;
  exportManager[selectValue](true);
});

document.getElementById("copyCapabilities").addEventListener("click", () => {
  const dataToCopy = document.getElementById("capabilities").textContent;
  dataToCopy && navigator.clipboard.writeText(dataToCopy);
});

document.querySelector("#results tbody").addEventListener("click", (event) => {
  if (event.target.classList.contains("applyResolution")) {
    const width = parseInt(event.target.dataset.width);
    const height = parseInt(event.target.dataset.height);
    const constraintsToPass = { video: { width: { ideal: width }, height: { ideal: height } } };
    if (event.target.dataset.fps) {
      const fps = parseInt(event.target.dataset.fps || 30); // default resolution of 30
      constraintsToPass.video.frameRate = { ideal: fps };
    }
    startStream(currentDeviceId, constraintsToPass);
  }
});

document.getElementById("videoSource").addEventListener("change", (e) => {
  const id = e.target.value;
  scanAll = false;
  if (id === "all") {
    scanAll = true;
    return;
  }
  startStream(id);
  document.getElementById("resultsSection").style.display = "none";
});

document.getElementById("closeWebcam").addEventListener("click", function (event) {
  currentStream && currentStream.getTracks().forEach((t) => t.stop());
  document.getElementById("videoWithButtons").style.display = "none";
  document.getElementById("shareCamera").style.display = "block";
});

document.querySelector("#shareCamera").addEventListener("click", function (event) {
  getVideoDevices()
    .then(() => {
      const actionBtns = document.getElementById("actionButtons");
      actionBtns.style.display = "flex";
      document.getElementById("videoWithButtons").style.display = "flex";
      this.style.display = "none";
      const select = document.getElementById("videoSource");
      if (select.options.length > 0) {
        startStream(select.value);
      }
    })
    .catch((e) => {
      alert("Could not start a video stream");
      log(`Could not start a video stream: ${e.name} - ${e.message}`);
    });
});
