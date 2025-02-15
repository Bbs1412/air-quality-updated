// ------------------------------------------------------------------------------
// Constants and DOM Elements
// ------------------------------------------------------------------------------
const Dashboard = {
    elements: {
        temp: document.getElementById('dash_temp'),
        aq: document.getElementById('dash_aq'),
        hum: document.getElementById('dash_hum'),
        lastUpdated: document.getElementById('last_updated')
    }
};

const Modal = {
    elements: {
        liveAuth: document.getElementById('live-auth-modal'),
        alert: document.getElementById('alert-modal'),
        closeBtn: document.querySelector('.close-modal'),
        authForm: document.getElementById('auth-form')
    }
};

// ------------------------------------------------------------------------------
// Dashboard Updates
// ------------------------------------------------------------------------------
function updateReadings(temp, hum, aq) {
    Dashboard.elements.temp.innerHTML = `${temp}°C`;
    Dashboard.elements.hum.innerHTML = `${hum}%`;
    Dashboard.elements.aq.innerHTML = aq;

    const now = new Date();
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';

    Dashboard.elements.lastUpdated.innerHTML = 
        `Data Last Updated - ${hours}:${minutes}:${seconds} ${period}`;
}

// ------------------------------------------------------------------------------
// Data Fetching and Plotting
// ------------------------------------------------------------------------------
async function fetchAndPlotData() {
    try {
        const points_count = 120;
        const response = await fetch(`/get_init_data/${points_count}`);
        const data = await response.json();

        // Update dashboard with latest values
        updateReadings(
            data.bs_temp[data.bs_temp.length - 1],
            data.bs_hum[data.bs_hum.length - 1],
            data.bs_mq135[data.bs_mq135.length - 1]
        );

        // 2D Plots
        plotData('plot2_temperature', data.bs_temp, 'Temperature');
        plotData('plot2_humidity', data.bs_hum, 'Humidity');
        plotData('plot2_air_quality', data.bs_mq135, 'Air Quality');

        // 3D Plots
        plot3D('plot3_temp_hum_feel', 
            data.bs_temp, data.bs_hum, data.bs_feel,
            'Temperature', 'Humidity', 'Feels Like'
        );
        
        plot3D('plot3_feel_hum_aq', 
            data.bs_feel, data.bs_hum, data.bs_mq135,
            'Feels Like', 'Humidity', 'Air Quality'
        );

        // Check for emergencies
        handleEmergencyAlerts(data.bs_fire, data.bs_gas);
    } catch (error) {
        console.error('Data fetch failed:', error);
    }
}

// ------------------------------------------------------------------------------
// Emergency Alert System
// ------------------------------------------------------------------------------
const AlertSystem = {
    show(fire, gas) {
        const alertContent = this.generateAlertContent(fire, gas);
        Modal.elements.alert.innerHTML = alertContent;
        Modal.elements.alert.classList.remove('hidden');
        this.notifyUser(fire, gas);
    },

    hide() {
        Modal.elements.alert.classList.add('hidden');
    },

    generateAlertContent(fire, gas) {
        const type = fire && gas ? 'both' : fire ? 'fire' : 'gas';
        const alerts = {
            both: {
                title: 'Fire and Gas Emergency',
                icon: 'i_emergency.png',
                message: 'Fire and harmful gases detected. Evacuate immediately!'
            },
            fire: {
                title: 'Fire Emergency',
                icon: 'i_burn.png',
                message: 'Fire detected. Evacuate immediately!'
            },
            gas: {
                title: 'Gas Emergency',
                icon: 'i_gas_leak.png',
                message: 'Harmful gases detected. Evacuate immediately!'
            }
        };

        const alert = alerts[type];
        return `
            <div class="alert-content">
                <img src="static/img/${alert.icon}" alt="Emergency">
                <h2>${alert.title}</h2>
                <p>${alert.message}</p>
                <div class="emergency-contacts">
                    <button onclick="window.location.href='tel:112'">Police: 112</button>
                    <button onclick="window.location.href='tel:101'">Fire: 101</button>
                    <button onclick="window.location.href='tel:102'">Ambulance: 102</button>
                </div>
            </div>
        `;
    },

    notifyUser(fire, gas) {
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const title = fire && gas ? "Fire and Gas Emergency!" :
                     fire ? "Fire Emergency!" : "Gas Emergency!";
        const message = fire && gas ? "Fire and harmful gases detected!" :
                       fire ? "Fire detected!" : "Harmful gases detected!";

        new Notification(title, { body: message });
    }
};

// ------------------------------------------------------------------------------
// Live Monitoring Modal
// ------------------------------------------------------------------------------
const LiveMonitoring = {
    init() {
        const liveBtn = document.getElementById('live-monitor-btn');
        liveBtn.addEventListener('click', () => this.showModal());
        Modal.elements.closeBtn.addEventListener('click', () => this.hideModal());
        Modal.elements.authForm.addEventListener('submit', (e) => this.handleAuth(e));
    },

    showModal() {
        Modal.elements.liveAuth.classList.remove('hidden');
    },

    hideModal() {
        Modal.elements.liveAuth.classList.add('hidden');
    },

    handleAuth(event) {
        event.preventDefault();
        // Authentication logic will be implemented here
    }
};

// ------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Initialize live monitoring
    LiveMonitoring.init();

    // Request notification permissions
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // Initial data fetch
    // fetchAndPlotData();

    // Set up periodic data refresh
    // setInterval(fetchAndPlotData, 30000);
});
