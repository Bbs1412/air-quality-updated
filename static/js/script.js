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

const AuthModal = {
    elements: {
        liveAuth: document.getElementById('live-auth-modal'),
        alert: document.getElementById('alert-modal'),
        closeBtn: document.querySelector('#live-auth-modal .close-modal'),
        authForm: document.getElementById('auth-form'),
        simulationForm: document.getElementById('simulation-form'),
        pointsInput: document.getElementById('points'),
        intervalInput: document.getElementById('interval')
    }
};

const AlertModal = {
    elements: {
        modal: document.getElementById('alert-modal'),
        title: document.querySelector('.alert-title'),
        message: document.querySelector('.alert-message'),
        icon: document.querySelector('.alert-icon'),
        closeBtn: document.querySelector('#alert-modal .close-modal')
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

async function fetchAndPlotData(isInitialFetch = false, isSimulated = true) {
    try {
        let data;

        // First data fetch (initial data, pre saved)
        if (isInitialFetch) {
            const init_points_count = 30;
            const response = await fetch(`/get_init_data/${init_points_count}`);
            data = await response.json();
        }

        // Simulate data fetch (serial, pre saved)
        else if (isSimulated) {
            points_count += 1;
            const response = await fetch(`/get_serial_data/${points_count}`);
            data = await response.json();
        }

        // get data from firebase...
        else {
            const response = await fetch('/get_data');
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
        ChartSystem.updateCharts(
            data.bs_temp[data.bs_temp.length - 1],
            data.bs_feel[data.bs_feel.length - 1],
            data.bs_mq135[data.bs_mq135.length - 1]
        );

        // Update the plots:
        PlotlyChartSystem.update2D('plot2_temperature', data.bs_temp);
        PlotlyChartSystem.update2D('plot2_humidity', data.bs_hum);
        PlotlyChartSystem.update2D('plot2_air_quality', data.bs_mq135);
        PlotlyChartSystem.update2D('plot2_feels_like', data.bs_feel);

        PlotlyChartSystem.update3D('plot3_temp_hum_feel', data.bs_temp, data.bs_hum, data.bs_feel);
        PlotlyChartSystem.update3D('plot3_feel_hum_aq', data.bs_feel, data.bs_hum, data.bs_mq135);

        // Check for emergencies
        AlertSystem.handleEmergency(data.bs_fire, data.bs_gas);
        // console.log('Emergency:', data.bs_fire, data.bs_gas);
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
        const alert = this.generateAlertContent(fire, gas);

        // Update DOM elements
        AlertModal.elements.title.textContent = alert.title;
        AlertModal.elements.icon.src = `static/img/${alert.icon}`;
        AlertModal.elements.message.textContent = alert.message;

        // Show modal
        AlertModal.elements.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this.notifyUser(fire, gas);
    },

    hide() {
        AlertModal.elements.modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    },

    init() {
        AlertModal.elements.modal.classList.add('hidden');
        AlertModal.elements.closeBtn.addEventListener('click', () => this.hide());
        this.hide();
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

        return alerts[type];
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
        // Control "Live Monitoring" button
        const liveBtn = document.getElementById('live-monitor-btn');
        liveBtn.addEventListener('click', () => this.showModal());

        this.focusOnActiveTab();
        this.handleNumericInput();

        // Submit and close behavior
        AuthModal.elements.authForm.addEventListener('submit', (e) => this.handleAuth(e));
        AuthModal.elements.simulationForm.addEventListener('submit', (e) => this.handleSimulation(e));

        AuthModal.elements.liveAuth.classList.add('hidden');
        AuthModal.elements.closeBtn.addEventListener('click', () => this.hideModal());
    },

    showModal() {
        AuthModal.elements.liveAuth.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    hideModal() {
        AuthModal.elements.liveAuth.classList.add('hidden');
        document.body.style.overflow = 'auto';
        // AuthModal.elements.liveAuth.classList.add('hidden');
        AuthModal.elements.authForm.reset();
        AuthModal.elements.simulationForm.reset();
    },

    // fn which changes css for active tab in "Live Monitoring" modal:
    // Either "Login Authentication" or "Simulation Settings"
    focusOnActiveTab() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panes
                document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                // Add active class to clicked tab and corresponding pane
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    },

    // fn to handle numeric input fields
    // (Live Monitoring Modal > Simulation Settings)
    // Changes the numbers as per click on + or - buttons 
    handleNumericInput() {
        document.querySelectorAll('.number-input').forEach(wrapper => {
            const input = wrapper.querySelector('input');
            const minusBtn = wrapper.querySelector('.minus');
            const plusBtn = wrapper.querySelector('.plus');

            minusBtn.addEventListener('click', () => {
                const currentValue = parseInt(input.value);
                const minValue = parseInt(input.min);
                if (currentValue > minValue) {
                    input.value = currentValue - 1;
                }
            });

            plusBtn.addEventListener('click', () => {
                const currentValue = parseInt(input.value);
                const maxValue = parseInt(input.max);
                if (currentValue < maxValue) {
                    input.value = currentValue + 1;
                }
            });

            // Validate minimum interval
            if (input.id === 'interval') {
                input.addEventListener('change', () => {
                    if (parseInt(input.value) < 3) {
                        input.value = 3;
                    }
                });
            }

            if (input.id === 'points') {
                input.addEventListener('change', () => {
                    if (parseInt(input.value) < input.min) {
                        input.value = input.min;
                    }
                    if (parseInt(input.value) > input.max) {
                        input.value = input.max;
                    }
                });
            }
        });
    },


    async handleAuth(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        console.warn('Authentication attempted:', { username });

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.status) {
                this.hideModal();
                this.startLiveMonitoring(isSimulated = false);
            } else {
                // Show error using alert modal
                AlertModal.elements.title.textContent = 'Authentication Error';
                AlertModal.elements.message.textContent = 'Invalid username or password';
                AlertModal.elements.icon.src = 'static/img/i_error.png';
                AlertModal.elements.modal.classList.remove('hidden');
            }
        } catch (error) {
            AlertModal.elements.title.textContent = 'Connection Error';
            AlertModal.elements.message.textContent = 'Failed to connect to server';
            AlertModal.elements.icon.src = 'static/img/i_error.png';
            AlertModal.elements.modal.classList.remove('hidden');
        }
    },

    handleSimulation(event) {
        event.preventDefault();
        const points = parseInt(AuthModal.elements.pointsInput.value);
        const interval = parseInt(AuthModal.elements.intervalInput.value) * 1000;

        this.update_interval = interval;
        // Set global points_count
        points_count = points;

        this.hideModal();
        this.startLiveMonitoring(isSimulated = true);
    },

    startLiveMonitoring(isSimulated = true) {
        if (this.active) return;
        this.active = true;

        // Initial fetch
        // fetchAndPlotData(false, isSimulated);
        // Avoiding this as I want the fetch to be initiated EXPLICITLY only.

        this.interval = setInterval(() => {
            fetchAndPlotData(false, isSimulated);
        }, this.update_interval);

        console.warn('Live monitoring started:', isSimulated ? 'Simulation' : 'Real-time');
    },

    stopLiveMonitoring() {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        console.warn('Live monitoring stopped');
    }
};

// ------------------------------------------------------------------------------
// Chart Configurations (AQI and Temperature)
// ------------------------------------------------------------------------------

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
        this.gaugeChart.animationSpeed = 60;
        this.gaugeChart.set(0);
    },

    initTempChart() {
        const canvas = document.getElementById('temp-donut');
        const ctx = canvas.getContext('2d');

        // Fix pixel density for high-DPI displays
        // const dpr = window.devicePixelRatio || 1;
        // canvas.width = canvas.clientWidth * dpr;
        // canvas.height = canvas.clientHeight * dpr;
        // ctx.scale(dpr, dpr);

        this.tempChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [
                    {
                        label: "Comfort Zones",
                        // 0-15 cold, 15-25 moderate, 25-35 hot, 35-50 extreme
                        data: [15, 10, 10, 15],
                        backgroundColor: [
                            "rgba(59, 130, 246, 1)",        // Cold zone - Blue
                            "rgba(22, 163, 74, 1)",         // Moderate zone - Green
                            "rgba(234, 179, 8, 1)",         // Hot zone - Yellow
                            "rgba(220, 38, 38, 1)",         // Extreme zone - Red
                        ],
                        borderWidth: 0,
                        borderRadius: 2,
                        weight: 1.75
                    },
                    {
                        label: "Feels Like Temp",
                        data: [0, 50],
                        backgroundColor: [
                            "rgba(147, 51, 234, 1)",        // Purple
                            'rgba(79, 20, 140, 0.1)'
                            // 'rgba(0, 0, 0, 0.18)'
                        ],
                        borderWidth: 0,
                        borderRadius: 5,
                        weight: 2
                    },
                    {
                        label: "Actual Temp",
                        data: [0, 50],
                        backgroundColor: [
                            "rgba(0, 188, 212, 1)",         // Cyan
                            'rgba(0, 77, 102, 0.20)'
                            // 'rgba(0, 0, 0, 0.45)'
                        ],
                        borderWidth: 0,
                        borderRadius: 5,
                        weight: 2.25
                    }
                ]
            },
            options: {
                limitMax: true,
                limitMin: true,
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                const zones = {
                                    0: "Cold (0°C - 15°C)",
                                    1: "Moderate (15°C - 25°C)",
                                    2: "Hot (25°C - 35°C)",
                                    3: "Extremely Hot (35°C - 50°C)"
                                };

                                // Display zone name for first dataset
                                if (tooltipItem.datasetIndex === 0) {
                                    return zones[tooltipItem.dataIndex];
                                }
                                // Display actual value for other datasets
                                return `${tooltipItem.dataset.label}: ${tooltipItem.raw}°C`;
                            }
                        }
                    }
                }
            }
        });
    },

    updateCharts(temp, feels, aqi) {
        this.gaugeChart.set(aqi);
        document.querySelector('.aqi-label').textContent = `AQI: ${aqi} (${this.getAQILevel(aqi)})`;

        const maxTemp = 50;
        const actualRatio = (temp / maxTemp) * 50;
        const feelsLikeRatio = (feels / maxTemp) * 50;
        this.tempChart.data.datasets[1].data = [feelsLikeRatio, 50 - feelsLikeRatio];
        this.tempChart.data.datasets[2].data = [actualRatio, 50 - actualRatio];
        this.tempChart.update();

        document.querySelector('.temp-difference').textContent = `Actual: ${temp}°C | Feels Like: ${feels}°C`;
    },
};

// ------------------------------------------------------------------------------
// Historical Data Plots (2D and 3D)
// ------------------------------------------------------------------------------

const PlotlyChartSystem = {
    plots: {}, // Store initialized plot references

    // ----------------------------------------------------------------
    // 2D Plot - Old Method (plotData)
    // ----------------------------------------------------------------
    plotData_legacy(elementId, data, yLabel) {
        const len = data.length;
        const div = Math.floor(len / 24);
        let j = 0;
        let num = 0;
        let xValues = [];

        for (let i = 0; i < len - 1; i++) {
            if (i == num && j != 24) {
                xValues.push(`${j}:00`);
                num += div;
                j++;
            } else {
                xValues.push("xx:" + i);
            }
        }
        xValues.push('23:59');

        const trace = {
            x: xValues,
            y: data,
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: 'white', size: 3 },
            line: { color: 'lightgreen' }
        };

        const layout = {
            plot_bgcolor: 'black',
            paper_bgcolor: 'black',
            xaxis: {
                color: 'white',
                title: 'Time',
                tickvals: ["0:00", "4:00", "8:00", "12:00", "16:00", "20:00", "23:59"]
            },
            yaxis: {
                color: 'white',
                title: yLabel
            }
        };

        Plotly.newPlot(elementId, [trace], layout);
    },

    // ----------------------------------------------------------------
    // 2D Plot - New Optimized Method (plotData2)
    // ----------------------------------------------------------------
    init2D(elementId, yLabel) {
        const trace = {
            x: this.generateTimeLabels(100),  // Initial dummy data
            y: new Array(100).fill(0),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: '#00f2fe',
                width: 3,
                shape: 'spline'
            },
            fill: 'tozeroy',
            fillcolor: 'rgba(0, 242, 254, 0.1)'
        };

        const layout = {
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: {
                color: '#a0aec0',
                family: 'Inter, sans-serif'
            },
            margin: {
                l: 50, r: 30,
                t: 30, b: 50
            },
            xaxis: {
                showgrid: true,
                gridcolor: 'rgba(255,255,255,0.1)',
                tickformat: '%H:%M'
            },
            yaxis: {
                title: yLabel,
                showgrid: true,
                gridcolor: 'rgba(255,255,255,0.1)'
            }
        };

        Plotly.newPlot(elementId, [trace], layout, {
            responsive: true,
            displayModeBar: false
        });

        // Store plot reference:
        this.plots[elementId] = {
            data: trace, layout
        };
    },

    update2D(elementId, data) {
        if (this.plots[elementId]) {
            Plotly.update(elementId, {
                y: [data],
                x: [this.generateTimeLabels(data.length)]
            });
        }
    },

    // ----------------------------------------------------------------
    // 3D Plot - Old Method (plot3D)
    // ----------------------------------------------------------------
    plot3D_legacy(elementId, xData, yData, zData, xLabel, yLabel, zLabel) {
        const trace = {
            x: xData,
            y: yData,
            z: zData,
            mode: 'markers',
            marker: {
                color: 'rgb(23, 190, 207)',
                size: 12,
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d'
        };

        const layout = {
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: 'black',
            scene: {
                xaxis: { color: 'white', title: xLabel },
                yaxis: { color: 'white', title: yLabel },
                zaxis: { color: 'white', title: zLabel }
            }
        };

        Plotly.newPlot(elementId, [trace], layout);
    },

    // ----------------------------------------------------------------
    // 3D Plot - New Optimized Method (plot3Dv2)
    // ----------------------------------------------------------------
    init3D(elementId, xLabel, yLabel, zLabel, palette = 'Viridis') {
        const trace = {
            type: 'scatter3d',
            mode: 'markers',
            x: [],
            y: [],
            z: [],
            marker: {
                size: 11,
                color: [],
                colorscale: palette,
                opacity: 0.8
            }
        };

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            scene: {
                xaxis: {
                    title: xLabel,
                    gridcolor: 'rgba(255,255,255,0.1)',
                    // showbackground: true,
                    backgroundcolor: 'rgba(0,0,0,0)'
                },
                yaxis: {
                    title: yLabel,
                    gridcolor: 'rgba(255,255,255,0.1)',
                    // showbackground: true,
                    backgroundcolor: 'rgba(0,0,0,0)'
                },
                zaxis: {
                    title: zLabel,
                    gridcolor: 'rgba(255,255,255,0.1)',
                    // showbackground: true,
                    backgroundcolor: 'rgba(0,0,0,0)'
                },
                camera: {
                    // eye: {x: 1.5, y: 1.5, z: 1.5}
                    eye: { x: 0.8, y: 0.8, z: 0.2 }
                }
            },
            margin: { l: 0, r: 0, t: 0, b: 0 }
        };

        Plotly.newPlot(elementId, [trace], layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });

        // Store plot reference:
        this.plots[elementId] = { data: trace, layout };
    },

    update3D(elementId, xData, yData, zData) {
        if (this.plots[elementId]) {
            Plotly.update(elementId, {
                x: [xData],
                y: [yData],
                z: [zData],
                'marker.color': [zData]
            });
        }
    },

    // ----------------------------------------------------------------
    // Generate Time Labels
    // ----------------------------------------------------------------
    generateTimeLabels(count) {
        const labels = [];
        const now = new Date();
        const interval = 24 * 60 / count;

        for (let i = 0; i < count; i++) {
            const time = new Date(now - (count - i) * interval * 60000);
            labels.push(time);
        }

        return labels;
    }
};


// ------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

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

    // Initialize live monitoring
    LiveMonitoring.init();

    // Initialize alert system
    AlertSystem.init();

    // Initialize charts
    ChartSystem.initCharts();

    // Initialize optimized 2d, 3d plots
    PlotlyChartSystem.init2D('plot2_temperature', 'Temperature');
    PlotlyChartSystem.init2D('plot2_humidity', 'Humidity');
    PlotlyChartSystem.init2D('plot2_air_quality', 'Air Quality');
    PlotlyChartSystem.init2D('plot2_feels_like', 'Feels Like Temperature');

    PlotlyChartSystem.init3D('plot3_temp_hum_feel', 'Temperature', 'Humidity', 'Feels Like Temperature', 'Magma');
    PlotlyChartSystem.init3D('plot3_feel_hum_aq', 'Feels Like Temperature', 'Humidity', 'Air Quality', 'Electric');

    // Initial data fetch
    fetchAndPlotData(isInitialFetch = true);

    // Start live monitoring (only for development)
    // LiveMonitoring.startLiveMonitoring();

    // Resize = reload:
    // let resizeTimer;
    // window.addEventListener("resize", () => {
    //     clearTimeout(resizeTimer);
    //     resizeTimer = setTimeout(() => {
    //         location.reload();
    //     }, 500);
    // });

});


// ------------------------------------------------------------------------------
// Play: 
// FixMe: Just Trying it, hehe :)
// ------------------------------------------------------------------------------

// Dashboard:
// updateReadings(temp = 25, hum = 50, aq = 200);
// Charts:
// ChartSystem.updateCharts(temp=25, feels=27, aqi=200);
// Alerts:
// AlertSystem.show(fire = true, gas = false);
// Demo Live Monitoring: 
// points_count = 1300;
// fetchAndPlotData(false, isSimulated = true);
// or Use UI to start live monitoring in simulation mode (dataset has 1311 points)


// ------------------------------------------------------------------------------
// Temp Test:
// ------------------------------------------------------------------------------

