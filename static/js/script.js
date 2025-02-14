// ------------------------------------------------------------------------------
// Dashboard part:
// ------------------------------------------------------------------------------

const last_updated = document.getElementById("last_updated");
const dash_temp = document.getElementById('dash_temp');
const dash_aq = document.getElementById('dash_aq');
const dash_hum = document.getElementById('dash_hum');

function updateReadings(temp, hum, aq) {
    dash_temp.innerHTML = `${temp} °C`;
    dash_hum.innerHTML = `${hum} %`;
    dash_aq.innerHTML = `${aq} `;

    var now = new Date(Date.now());
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    // console.log(`Last Updated: ${hours}:${minutes}:${seconds}`);
    last_updated.innerHTML = `Last Updated: ${hours}:${minutes}:${seconds}`;
    return true;
}

updateReadings(28.4, 75, 130);

// ------------------------------------------------------------------------------
// Plot part:
// ------------------------------------------------------------------------------

function fetchAndPlotData() {
    const points_count = 120;
    fetch(`/get_init_data/${points_count}`)
        .then(response => response.json())
        .then(data => {
            // 2D Plots
            plotData('plot2_temperature', data.bs_temp, 'Temperature');
            plotData('plot2_humidity', data.bs_hum, 'Humidity');
            plotData('plot2_air_quality', data.bs_mq135, 'Air Quality');
            plotData('plot2_feels_like', data.bs_feel, 'Feels Like Temperature');

            // 3D Plots
            plot3D('plot3_temp_hum_feel', data.bs_temp, data.bs_hum, data.bs_feel,
                'Temperature', 'Humidity', 'Feels Like Temperature');

            plot3D('plot3_feel_hum_aq', data.bs_feel, data.bs_hum, data.bs_mq135,
                'Feels Like Temperature', 'Humidity', 'Air Quality');

            // Trigger error box if fire or gas is detected
            activate_error_box(data.bs_fire, data.bs_gas);
        })
        .catch(error => console.error("Error fetching data:", error));
}




// ------------------------------------------------------------------------------
// Emergency Alert part:
// ------------------------------------------------------------------------------

const mn = document.getElementById('main');
const warning_title = document.getElementById('warning_title');
const warning_detail = document.getElementById('warning_detail');
const warning_title_text = document.getElementById('warning_title_text');
const err_box = document.getElementById('errBox');
const err_icon = document.getElementById('warning_icon');

function activate_error_box(fire, gas) {
    if (fire || gas) {
        mn.style.cssText = 'filter: blur(2px)';
        err_box.style.display = 'flex';

        if (fire && gas) {
            warning_title_text.innerHTML = "Fire and <br> Harmful Gases ";

            // err_icon.src = "/static/img/i_emergency.png";
            err_icon.src = "static/img/i_emergency.png";

            warning_detail.innerHTML = "Fire and high level of Harmful gases have been detected in your house. <br> Evacuate immediately !!!";

            showNotification("Emergency Alert!", "Elevated levels of harmful gases and fire have been detected in your residence. Please evacuate immediately for your safety!”");
        }
        else if (fire) {
            warning_title_text.innerHTML = "Flames <br> Detected";

            err_icon.src = "static/img/i_burn.png";
            // err_icon.src = "/static/img/i_burn.png";

            warning_detail.innerHTML = "Fire Detected in your house. <br> Evacuate immediately !!!";

            showNotification("Fire Emergency!", "Fire is detected at your residence!! Evacuate immediately for your safety ");
        }
        else if (gas) {
            warning_title_text.innerHTML = "Gas Leakage <br> Detected";

            err_icon.src = "static/img/i_gas_leak.png";

            warning_detail.innerHTML = "Raised level of Harmful gases has been detected in your house. <br> Evacuate immediately !!!";

            showNotification("Gas Emergency!", "Harmful Gases are detected !!  Evacuate immediately ");
        }
    }

    else {
        mn.style.cssText = 'filter: none';
        err_box.style.display = 'none'
        warning_title_text.innerHTML = "";
        warning_detail.innerHTML = "";
    }

    return true;
}

// Function to show a notification
function showNotification(title, message) {
    // Check if notifications are supported by the browser
    if (!("Notification" in window)) {
        console.log("Notifications not supported");
        return false;
    }

    // Check if permission to show notifications is granted
    if (Notification.permission !== "granted") {
        console.log("Permission to show notifications denied");
        return false;
    }

    // Show the notification
    new Notification(title, {
        body: message
    });
    return true;
}

// ------------------------------------------------------------------------------
// Footer part:
// ------------------------------------------------------------------------------

const prof_bs = document.getElementById('prof_bhushan');

prof_bs.style.cursor = 'pointer';
prof_bs.title = "Click to visit my profile";

prof_bs.addEventListener('click', () => {
    window.open('https://www.linkedin.com/in/bhushan-songire', '_blank');
})


// ------------------------------------------------------------------------------
// Initializer Part:
// when full page is loaded, this function will be called
// ------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
    console.info("Document Loaded");

    // plot initial data:
    fetchAndPlotData();

    // Get permission to show notifications:
    if ("Notification" in window) {
        Notification.requestPermission().then(function (permission) {
            if (permission !== "granted") {
                console.warn("Permission to show notifications denied");
            }
            else {
                console.info("Permission to show notifications granted");
            }
        });
    } else {
        console.warn("Notifications not supported");
    }

    // updateReadings(25, 40, 100);
    // showNotification("Welcome", "Dashboard is ready");
});
