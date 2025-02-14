// <!-- to show that alert box -->
const mn = document.getElementById('main');
const warning_title = document.getElementById('warning_title');
const warning_detail = document.getElementById('warning_detail');
const err_box = document.getElementById('errBox');
const err_icon = document.getElementById('warning_icon');

function activate_error_box(fire, gas) {
    if (fire || gas) {
        mn.style.cssText = 'filter: blur(2px)';
        err_box.style.display = 'flex';

        if (fire && gas) {
            warning_title_text.innerHTML = "Fire and <br> Harmful Gases ";

            // err_icon.src = "/static/img/i_emergency.png";
            err_icon.src = "static/i_emergency.png";

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

            err_icon.src = "./assets/i_gas_leak.png";

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


// <!-- Notification script: -->
// Request permission to show notifications when the page is loaded
document.addEventListener('DOMContentLoaded', function () {
    if ("Notification" in window) {
        Notification.requestPermission().then(function (permission) {
            if (permission !== "granted") {
                console.log("Permission to show notifications denied");
            }
        });
    } else {
        console.log("Notifications not supported");
    }
});

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


/*

function showNotification(title, message) {
    // Check if notifications are supported by the browser
    if (!("Notification" in window)) {
        console.log("Notifications not supported");
        return false;
    }

    // Check if permission to show notifications is granted
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(function (permission) {
            if (permission !== "granted") {
                console.log("Permission to show notifications denied");
                return false;
            } else {
                // Show the notification
                new Notification(title, {
                    body: message
                });
                return true;
            }
        });
    } else {
        // Show the notification
        new Notification(title, {
            body: message
        });
        return true;
    }
}
*/

// showNotification("Fire Detected", "Fire Detected in your house. Evacuate!!");