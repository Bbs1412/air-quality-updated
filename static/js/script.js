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
            const points_count = 120;
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


        // 2D Plots
        plotData('plot2_temperature', data.bs_temp, 'Temperature');
        plotData('plot2_humidity', data.bs_hum, 'Humidity');
        plotData('plot2_air_quality', data.bs_mq135, 'Air Quality');
        plotData('plot2_feels_like', data.bs_feel, 'Feels Like Temperature');

        // 3D Plots
        plot3D('plot3_temp_hum_feel',
            data.bs_temp, data.bs_hum, data.bs_feel,
            'Temperature', 'Humidity', 'Feels Like Temperature'
        );

        plot3D('plot3_feel_hum_aq',
            data.bs_feel, data.bs_hum, data.bs_mq135,
            'Feels Like Temperature', 'Humidity', 'Air Quality'
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

const ChartSystem = {
    gaugeChart: null,
    donutChart: null,

    commonChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        // animation: false, // Disable animations for better performance[8]
        resizeDelay: 100 // Debounce resize events
    },

    initCharts() {
        this.initGaugeChart();
        this.initDonutChart();
    },

    initGaugeChart() {
        const colors = {
            good: '#48bb78',
            moderate: '#f6e05e',
            sensitive: '#ed8936',
            unhealthy: '#f56565',
            veryUnhealthy: '#9f7aea',
            hazardous: '#800000'
        };

        const target = document.getElementById('aqi-gauge');
        this.gaugeChart = new Gauge(target).setOptions({
            angle: -0.2,
            lineWidth: 0.2,
            radiusScale: 0.9,
            pointer: {
                length: 0.6,
                strokeWidth: 0.035,
                color: '#00f2fe'
            },
            limitMax: true,
            limitMin: true,
            strokeColor: '#1a1f2c',
            generateGradient: true,
            highDpiSupport: true,
            staticLabels: {
                font: "12px Inter",
                labels: [0, 100, 200, 300, 400, 500],
                color: '#a0aec0',
                fractionDigits: 0
            },
            staticZones: [
                { strokeStyle: colors.good, min: 0, max: 50 },
                { strokeStyle: colors.moderate, min: 51, max: 100 },
                { strokeStyle: colors.sensitive, min: 101, max: 150 },
                { strokeStyle: colors.unhealthy, min: 151, max: 200 },
                { strokeStyle: colors.veryUnhealthy, min: 201, max: 300 },
                { strokeStyle: colors.hazardous, min: 301, max: 500 }
            ]
        });

        this.gaugeChart.maxValue = 500;
        this.gaugeChart.setMinValue(0);
        this.gaugeChart.animationSpeed = 32;
        this.gaugeChart.set(0);
    },

    initDonutChart() {
        const ctx = document.getElementById('temp-donut').getContext('2d');
        this.donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [25, 75],
                    backgroundColor: [
                        'rgba(0, 242, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)'
                    ]
                }]
            },
            options: {
                ...this.commonChartOptions,
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    updateCharts(temp, feels, aqi) {
        // Update AQI Gauge
        this.gaugeChart.set(aqi);

        // Update AQI label with level
        const aqiLevel = this.getAQILevel(aqi);
        document.querySelector('.aqi-label').innerHTML =
            `${aqi} PPM <span>${aqiLevel}</span>`;

            
        // Update Temperature Donut
        this.donutChart.data.datasets[0].data = [temp, feels];
        this.donutChart.update();

        // Update labels
        document.querySelector('.aqi-label').textContent =
            `AQI: ${aqi} (${this.getAQILevel(aqi)})`;
        document.querySelector('.temp-difference').textContent =
            `Actual: ${temp}°C | Feels Like: ${feels}°C`;
    },

    calculateAQISegments(aqi) {
        const total = 500;
        const segments = [0, 0, 0, 0, 0, 0];

        if (aqi <= 50) segments[0] = aqi;
        else if (aqi <= 100) segments[1] = aqi - 50;
        else if (aqi <= 150) segments[2] = aqi - 100;
        else if (aqi <= 200) segments[3] = aqi - 150;
        else segments[4] = Math.min(aqi - 200, 300);

        segments[5] = total - aqi;
        return segments;
    },

    getAQIColor(aqi) {
        if (aqi <= 50) return '#48bb78';
        if (aqi <= 100) return '#f6e05e';
        if (aqi <= 150) return '#ed8936';
        if (aqi <= 200) return '#f56565';
        return '#9f7aea';
    },

    getAQILevel(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Sensitive';
        // if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }
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
    const authorLink = document.querySelector('.author-link');
    if (authorLink) {
        authorLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://www.linkedin.com/in/bhushan-songire', '_blank');
        });
    }
});