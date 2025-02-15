// ------------------------------------------------------------------------------
// Constants and DOM Elements
// ------------------------------------------------------------------------------

const Dashboard = {
    elements: {
        temp: document.getElementById('dash_temp'),
        aq: document.getElementById('dash_aq'),
        hum: document.getElementById('dash_hum'),
        lastUpdated: document.getElementById('last_updated'),
        copyright: document.querySelector('.copyright')
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
    // Dashboard.elements.aq.innerHTML = `${aq} ADC`;
    Dashboard.elements.aq.innerHTML = `${aq}ppm`;

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

let points_count = 1;

async function fetchAndPlotData(isInitialFetch = false) {
    try {
        let data;

        if (isInitialFetch) {
            const points_count = 2000;
            const response = await fetch(`/get_init_data/${points_count}`);
            data = await response.json();
        }

        else {
            // const response = await fetch('/get_data');
            // data = await response.json();

            // Simulate data fetch:
            points_count += 1;
            const response = await fetch(`/get_serial_data/${points_count}`);
            data = await response.json();
        }

        console.log('Data fetched: ', data.bs_temp.length);

        // Update dashboard with latest values
        updateReadings(
            data.bs_temp[data.bs_temp.length - 1],
            data.bs_hum[data.bs_hum.length - 1],
            data.bs_mq135[data.bs_mq135.length - 1]
        );

        // Gauge and Donut Charts:
        // In the try block of fetchAndPlotData, after updating readings:
        ChartSystem.updateCharts(
            data.bs_temp[data.bs_temp.length - 1],
            data.bs_feel[data.bs_feel.length - 1],
            data.bs_mq135[data.bs_mq135.length - 1]
        );


        // 2D Plots (plotData2 is new, plotData is old):
        plotData2('plot2_temperature', data.bs_temp, 'Temperature');
        plotData2('plot2_humidity', data.bs_hum, 'Humidity');
        plotData2('plot2_air_quality', data.bs_mq135, 'Air Quality');
        plotData2('plot2_feels_like', data.bs_feel, 'Feels Like Temperature');

        // Mix n Match:
        // plotData('plot2_temperature', data.bs_temp, 'Temperature');
        // plotData2('plot2_humidity', data.bs_hum, 'Humidity');
        // plotData('plot2_air_quality', data.bs_mq135, 'Air Quality');
        // plotData2('plot2_feels_like', data.bs_feel, 'Feels Like Temperature');

        // 3D Plots
        plot3Dv2('plot3_temp_hum_feel',
            data.bs_temp, data.bs_hum, data.bs_feel,
            'Temperature', 'Humidity', 'Feels Like Temperature',
            'Magma'
        );

        plot3Dv2('plot3_feel_hum_aq',
            data.bs_feel, data.bs_hum, data.bs_mq135,
            'Feels Like Temperature', 'Humidity', 'Air Quality',
            'Electric'
        );

        
        // Check for emergencies
        AlertSystem.handleEmergency(data.bs_fire, data.bs_gas);
    } catch (error) {
        console.error('Data fetch failed:', error);
        updateReadings('--', '--', '---');
    }
}

// ------------------------------------------------------------------------------
// Emergency Alert System
// ------------------------------------------------------------------------------

const AlertSystem = {
    handleEmergency(fire, gas) {
        if (!fire && !gas) {
            this.hide();
            return;
        }
        this.show(fire, gas);
    },

    show(fire, gas) {
        const alertContent = this.generateAlertContent(fire, gas);
        Modal.elements.alert.innerHTML = alertContent;
        Modal.elements.alert.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.notifyUser(fire, gas);
    },

    hide() {
        Modal.elements.alert.classList.add('hidden');
        document.body.style.overflow = 'auto';
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
                <button class="close-alert" onclick="AlertSystem.hide()">&times;</button>
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

        new Notification(title, {
            body: message,
            icon: 'static/img/favicon.png'
            // icon: 'static/img/i_emergency.png'
        });
    }
};

// ------------------------------------------------------------------------------
// Live Monitoring System
// ------------------------------------------------------------------------------

const LiveMonitoring = {
    active: false,
    interval: null,
    update_interval: 5 * 1000,  // x seconds

    init() {
        const liveBtn = document.getElementById('live-monitor-btn');
        liveBtn.addEventListener('click', () => this.showModal());
        Modal.elements.closeBtn.addEventListener('click', () => this.hideModal());
        Modal.elements.authForm.addEventListener('submit', (e) => this.handleAuth(e));
    },

    showModal() {
        Modal.elements.liveAuth.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    hideModal() {
        Modal.elements.liveAuth.classList.add('hidden');
        document.body.style.overflow = 'auto';
        Modal.elements.authForm.reset();
    },

    handleAuth(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');

        // TODO: Implement actual authentication
        console.warn('Authentication attempted:', { username });
        this.hideModal();
    },

    startLiveMonitoring() {
        if (this.active) return;
        this.active = true;
        this.interval = setInterval(fetchAndPlotData, this.update_interval);
        console.warn('Live monitoring started');
    },

    stopLiveMonitoring() {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        console.warn('Live monitoring stopped');
    }
};

// ------------------------------------------------------------------------------
// Chart Configurations
// ------------------------------------------------------------------------------

// Fixing chart consistency and implementing concentric circles for temperature analysis
const ChartSystem = {
    gaugeChart: null,
    tempChart: null,

    commonChartOptions: {
        responsive: true,
        maintainAspectRatio: true,
        resizeDelay: 100
    },

    initCharts() {
        this.initGaugeChart();
        this.initTempChart();
    },

    getAQILevel(aqi) {
        const levels = {
            'Good': { text: 'Good', color: '#48bb78' },
            'Moderate': { text: 'Moderate', color: '#f6e05e' },
            'Sensitive': { text: 'Sensitive', color: '#ed8936' },
            // 'Sensitive': { text: 'Unhealthy for Sensitive Groups', color: '#ed8936' },
            'Unhealthy': { text: 'Unhealthy', color: '#f56565' },
            'Very Unhealthy': { text: 'Very Unhealthy', color: '#9f7aea' },
            'Hazardous': { text: 'Hazardous', color: '#800000' }
        };

        let level;
        if (aqi <= 50) level = levels['Good'];
        else if (aqi <= 100) level = levels['Moderate'];
        else if (aqi <= 150) level = levels['Sensitive'];
        else if (aqi <= 200) level = levels['Unhealthy'];
        else if (aqi <= 300) level = levels['Very Unhealthy'];
        else level = levels['Hazardous'];

        const label = document.querySelector('.aqi-label');
        label.style.backgroundColor = `${level.color}20`;
        label.style.color = level.color;
        return level.text;
    },

    initGaugeChart() {
        const target = document.getElementById('aqi-gauge');
        this.gaugeChart = new Gauge(target);
        this.gaugeChart.setOptions({
            // Update the translate -30 in css to move the gauge up/down
            // The angle range (in radians)
            angle: 0,
            // Make the line thicker
            lineWidth: 0.2,
            radiusScale: 0.75,
            pointer: {
                length: 0.5,
                strokeWidth: 0.035,
                color: '#00f2fe',
                iconPath: null
            },
            limitMax: true,
            limitMin: true,
            colorStart: '#6FADCF',
            colorStop: '#8FC0DA',
            strokeColor: '#1a1f2c',
            generateGradient: true,
            highDpiSupport: true,
            // Color gradient
            percentColors: [[0.0, "#48bb78"], [0.50, "#f6e05e"], [1.0, "#f56565"]],
            staticLabels: {
                font: "12px Inter",
                labels: [0, 100, 200, 300, 400, 500],
                color: "#a0aec0",
                fractionDigits: 0
            },
            staticZones: [
                { strokeStyle: "#48bb78", min: 0, max: 50 },
                { strokeStyle: "#f6e05e", min: 51, max: 100 },
                { strokeStyle: "#ed8936", min: 101, max: 150 },
                { strokeStyle: "#f56565", min: 151, max: 200 },
                { strokeStyle: "#9f7aea", min: 201, max: 300 },
                { strokeStyle: "#800000", min: 301, max: 500 }
            ],
            // renderTicks: {
            //     divisions: 5,
            //     divWidth: 1.1,
            //     divLength: 0.7,
            //     divColor: '#333333',
            //     subDivisions: 3,
            //     subLength: 0.5,
            //     subWidth: 0.6,
            //     subColor: '#666666'
            // }
        });

        this.gaugeChart.maxValue = 500;
        this.gaugeChart.setMinValue(0);
        this.gaugeChart.animationSpeed = 32;
        this.gaugeChart.set(0);
    },

    initTempChart() {
        const ctx = document.getElementById('temp-donut').getContext('2d');
        this.tempChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [
                    {
                        data: [30, 70],
                        backgroundColor: ['rgba(0, 242, 254, 0.8)', 'rgba(0, 0, 0, 0)'],
                        borderWidth: 0
                    },
                    {
                        data: [70, 30],
                        backgroundColor: ['rgba(79, 172, 254, 0.8)', 'rgba(0, 0, 0, 0)'],
                        borderWidth: 0
                    }
                ]
            },
            options: {
                ...this.commonChartOptions,
                cutout: '80%',
                plugins: { legend: { display: false } }
            }
        });
    },

    updateCharts(temp, feels, aqi) {
        this.gaugeChart.set(aqi);
        document.querySelector('.aqi-label').textContent = `AQI: ${aqi} (${this.getAQILevel(aqi)})`;

        this.tempChart.data.datasets[0].data = [temp, 100 - temp];
        this.tempChart.data.datasets[1].data = [feels, 100 - feels];
        this.tempChart.update();

        document.querySelector('.temp-difference').textContent = `Actual: ${temp}°C | Feels Like: ${feels}°C`;
    },


};


// ------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Initialize live monitoring
    LiveMonitoring.init();

    // Initialize charts
    ChartSystem.initCharts();

    // Request notification permissions
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.info("Notification permission granted");
            }
            else {
                console.warn("Notification permission denied");
            }
        });
    }

    // Initial data fetch
    fetchAndPlotData(isInitialFetch = true);

    // Start live monitoring (only for development)
    // LiveMonitoring.startLiveMonitoring();

    // Copyright link
    // const authorLink = document.querySelector('.author-link');
    // if (authorLink) {
    //     authorLink.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         window.open('https://www.linkedin.com/in/bhushan-songire', '_blank');
    //     });
    // }

    // Resize = reload:
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            location.reload();
        }, 500);
    });

});