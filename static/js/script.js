// ------------------------------------------------------------------------------
// Constants and DOM Elements
// ------------------------------------------------------------------------------

const Dashboard = {
    elements: {
        temp: document.getElementById('dash_temp'),
        aq: document.getElementById('dash_aq'),
        hum: document.getElementById('dash_hum'),
        lastUpdated: document.getElementById('last_updated'),
        copyright: document.querySelector('.copyright'),
        gaugeChartAQI: document.getElementById('aqi-gauge'),
        donutChartTemp: document.getElementById('temp-donut'),
        LiveMonitorBtn: document.getElementById('live-monitor-btn')
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

// Set this number to a value which will always be greater than the number of points that will be actually received in a single fetch.
const largeInitPoints = 1500;

// Actual number of points to fetch in FIRST FETCH (init data)
let initPointsCount = 30;
// const initPointsCount = 1200;

// ------------------------------------------------------------------------------
// Dashboard Updates
// ------------------------------------------------------------------------------

function updateReadings(temp, hum, aq) {
    // Animate temperature
    animateNumber('#dash_temp', temp, {
        suffix: '°C',
        duration: 500
    });

    // Animate humidity
    animateNumber('#dash_hum', hum, {
        suffix: '%',
        duration: 500
    });

    // Animate air quality
    animateNumber('#dash_aq', aq, {
        suffix: 'ppm',
        duration: 500
    });

    // Update timestamp
    const now = new Date();
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';

    Dashboard.elements.lastUpdated.innerHTML =
        `Data Last Updated - ${hours}:${minutes}:${seconds} ${period}`;
}

function animateNumber(element, number, options = {}) {
    const $element = $(element);
    const start = parseFloat($element.text()) || 0;
    const suffix = options.suffix || '';

    $element.prop('Counter', start).animate({
        Counter: number
    }, {
        duration: options.duration || 400,
        easing: 'swing',
        step: function (now) {
            const formatted = Number.isInteger(number) ?
                Math.ceil(now) :
                now.toFixed(1);
            $(this).text(formatted + suffix);
        },
        complete: function () {
            // Add a subtle scale animation at the end
            $(this).css('transform', 'scale(1.1)');
            setTimeout(() => {
                $(this).css('transform', 'scale(1)');
            }, 100);
        }
    });
}

// function updateReadings(temp, hum, aq) {
//     Dashboard.elements.temp.innerHTML = `${temp}°C`;
//     Dashboard.elements.hum.innerHTML = `${hum}%`;
//     // Dashboard.elements.aq.innerHTML = `${aq} ADC`;
//     Dashboard.elements.aq.innerHTML = `${aq}ppm`;

//     const now = new Date();
//     const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');
//     const seconds = String(now.getSeconds()).padStart(2, '0');
//     const period = now.getHours() >= 12 ? 'PM' : 'AM';

//     Dashboard.elements.lastUpdated.innerHTML =
//         `Data Last Updated - ${hours}:${minutes}:${seconds} ${period}`;
// }

// ------------------------------------------------------------------------------
// Data Fetching and Plotting
// ------------------------------------------------------------------------------

let points_count = 1;

async function fetchAndPlotData(isInitialFetch = false, isSimulated = true) {
    try {
        let data;

        // First data fetch (initial data, pre saved)
        if (isInitialFetch) {
            const init_points_count = initPointsCount;
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
            try {
                const response = await fetch('/get_live_data');
                resp = await response.json();

                if (response.status === 200) {
                    // Data fetched successfully
                    // data = resp.message;
                    data = PreProcessor.getProcessedResponse(resp.message);
                }

                else if (response.status === 403) {
                    // Unauthorized data case:
                    if (resp.error === "Unauthorized to access data") {
                        AlertSystem.showCustomAlert(
                            title = 'Authorization Error',
                            message = 'You need to be logged in to access this data.',
                            icon = "static/img/police.png",
                            notify = false
                        );
                    }

                    // Any other 403 case:
                    else {
                        AlertSystem.showCustomAlert(
                            title = 'Data Fetch Error',
                            message = resp.error || 'Failed to fetch data from server.'
                        );
                    }
                    return;
                }

                else if (response.status === 429) {
                    // Handle rate-limited error (too many requests)
                    AlertSystem.showCustomAlert(
                        title = 'Rate Limit Exceeded',
                        message = resp.error || 'You have made too many requests.',
                        icon = "static/img/police.png",
                        notify = false
                    );
                    // Stop the live monitoring
                    LiveMonitoring.stopLiveMonitoring();
                    return;
                }

                else {
                    // Handle unknown errors
                    AlertSystem.showCustomAlert(
                        title = 'Unknown Error',
                        message = 'An unexpected error occurred. Please try again later.'
                    );
                    return;
                }
            }

            catch (error) {
                console.error('Data Error:', error);

                AlertSystem.showCustomAlert(title = 'Data Related Error',
                    message = 'Failed to fetch or process data from server')

                updateReadings('--', '--', '---');
                return;
            }
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
        // PlotlyChartSystem.update2D('plot2_temperature', data.bs_temp);
        PlotlyChartSystem.updateSteamGraph('plot2_temperature', data.bs_temp, data.bs_feel);
        PlotlyChartSystem.update2D('plot2_humidity', data.bs_hum);
        PlotlyChartSystem.update2D('plot2_air_quality', data.bs_mq135);
        PlotlyChartSystem.update2D('plot2_feels_like', data.bs_feel);

        PlotlyChartSystem.update3D('plot3_temp_hum_feel', data.bs_temp, data.bs_hum, data.bs_feel);
        PlotlyChartSystem.update3D('plot3_feel_hum_aq', data.bs_feel, data.bs_hum, data.bs_mq135);

        // Check for emergencies
        AlertSystem.handleEmergency(data.bs_fire, data.bs_gas);
        // console.log('Emergency:', data.bs_fire, data.bs_gas);
    } catch (error) {
        console.error('Data Error:', error);
        updateReadings('--', '--', '---');
        AlertSystem.showCustomAlert(title = 'Data Error', message = 'Failed to plot data');
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
    },

    // Dedicated custom Alert:
    /**
    * Show a custom alert modal with a title, message, and icon.
    * - Notification title and message can be skipped
    * - They default to the title and message of the alert (if unspecified)
    */
    showCustomAlert(
        title = "Forgot to add Title :)",
        message = "Stay happy in life 😇",
        icon = "static/img/i_error.png",
        notify = false, notificationTitle = '', notificationMessage = '') {
        AlertModal.elements.title.textContent = title;
        AlertModal.elements.message.textContent = message;
        AlertModal.elements.icon.src = icon;

        // Show modal:
        AlertModal.elements.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Handle notification if requested
        if (notify && ("Notification" in window) && Notification.permission === "granted") {
            new Notification(
                notificationTitle || title,
                {
                    body: notificationMessage || message,
                    icon: 'static/img/favicon.png'
                }
            );
        }
    }
};

// ------------------------------------------------------------------------------
// Live Monitoring System
// ------------------------------------------------------------------------------

const LiveMonitoring = {
    active: false,
    interval: null,
    liveBtn: Dashboard.elements.LiveMonitorBtn,
    update_interval: 5 * 1000,  // x seconds

    init() {
        // Control "Live Monitoring" button
        // const liveBtn = Dashboard.elements.LiveMonitorBtn;
        this.liveBtn.addEventListener('click', () => this.handleButtonClick());

        this.focusOnActiveTab();
        this.handleNumericInput();

        // Submit and close behavior
        AuthModal.elements.authForm.addEventListener('submit', (e) => this.handleAuth(e));
        AuthModal.elements.simulationForm.addEventListener('submit', (e) => this.handleSimulation(e));

        AuthModal.elements.liveAuth.classList.add('hidden');
        AuthModal.elements.closeBtn.addEventListener('click', () => this.hideModal());
    },

    handleButtonClick() {
        if (this.active) {
            this.stopLiveMonitoring();
            // this.hideModal();
        } else {
            this.showModal();
        }
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

            this.hideModal();
            // console.log(response);
            const resp = await response.json();

            if (response.status === 200) {
                this.startLiveMonitoring(isSimulated = false);
            }
            else if (response.status === 403) {
                AlertSystem.showCustomAlert(
                    title = 'Login Failed',
                    message = resp.error || 'Invalid Email or Password entered.',
                );
            }
            else if (response.status === 429) {
                AlertSystem.showCustomAlert(
                    title = 'Access Denied',
                    message = resp.error,
                    icon = "static/img/police.png",
                    notify = true
                );
            }
            else {
                AlertSystem.showCustomAlert(
                    title = 'Authentication Error',
                    message = 'Authentication failed, please try again.',
                    notify = false,
                )
            }
        }
        catch (error) {
            console.error(error);
            AlertSystem.showCustomAlert(
                title = 'Unexpected Error',
                message = error,
            );

            // hide the emergency-contacts:
            // document.querySelector('.emergency-contacts').style.display = 'none';
            // This will hide them, but, need to figure out how to show them again in other cases (fire or gas) after one login attempt failed.
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

        // Raise one gas emergency, just for demo:
        AlertSystem.show(fire = false, gas = true);

        this.startLiveMonitoring(isSimulated = true);
    },

    startLiveMonitoring(isSimulated = true) {
        if (this.active) return;
        this.active = true;

        // Update button appearance
        this.liveBtn.classList.add('monitoring-active');
        this.liveBtn.querySelector('span').textContent = 'Stop Live Mode';

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

        // Reset button appearance
        this.liveBtn.classList.remove('monitoring-active');
        this.liveBtn.querySelector('span').textContent = 'Live Monitoring';

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
            'Good': { text: 'Good', color: 'rgba(72, 187, 120, 1)' },
            'Moderate': { text: 'Moderate', color: 'rgba(246, 224, 94, 1)' },
            'Sensitive': { text: 'Sensitive', color: 'rgba(237, 137, 54, 1)' },
            'Unhealthy': { text: 'Unhealthy', color: 'rgba(245, 101, 101, 1)' },
            'Very Unhealthy': { text: 'Very Unhealthy', color: 'rgba(159, 122, 234, 1)' },
            'Hazardous': { text: 'Hazardous', color: 'rgba(128, 0, 0, 1)' }
        };

        let level;
        if (aqi <= 50) level = levels['Good'];
        else if (aqi <= 100) level = levels['Moderate'];
        else if (aqi <= 150) level = levels['Sensitive'];
        else if (aqi <= 200) level = levels['Unhealthy'];
        else if (aqi <= 300) level = levels['Very Unhealthy'];
        else level = levels['Hazardous'];

        const label = document.querySelector('.aqi-label');
        label.style.color = level.color;
        label.style.backgroundColor = `${level.color.slice(0, -2)}0.2)`;
        return level.text;
    },

    initGaugeChart() {
        const target = Dashboard.elements.gaugeChartAQI;
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
                color: 'rgba(0, 242, 254, 1)',
                iconPath: null
            },
            limitMax: true,
            limitMin: true,
            colorStart: 'rgba(111, 173, 207, 1)',
            colorStop: 'rgba(143, 192, 218, 1)',
            strokeColor: 'rgba(26, 31, 44, 1)',
            generateGradient: true,
            highDpiSupport: true,
            // Color gradient
            percentColors: [
                [0.0, "rgba(72, 187, 120, 1)"],
                [0.50, "rgba(246, 224, 94, 1)"],
                [1.0, "rgba(245, 101, 101, 1)"]
            ],
            staticLabels: {
                font: "12px Inter",
                labels: [0, 100, 200, 300, 400, 500],
                color: "rgba(160, 174, 192, 1)",
                fractionDigits: 0
            },
            staticZones: [
                { strokeStyle: "rgba(72, 187, 120, 1)", min: 0, max: 50 },
                { strokeStyle: "rgba(246, 224, 94, 1)", min: 51, max: 100 },
                { strokeStyle: "rgba(237, 137, 54, 1)", min: 101, max: 150 },
                { strokeStyle: "rgba(245, 101, 101, 1)", min: 151, max: 200 },
                { strokeStyle: "rgba(159, 122, 234, 1)", min: 201, max: 300 },
                { strokeStyle: "rgba(128, 0, 0, 1)", min: 301, max: 500 }
            ],
            // renderTicks: {
            //     divisions: 5,
            //     divWidth: 1.1,
            //     divLength: 0.7,
            //     divColor: 'rgba(51, 51, 51, 1)',
            //     subDivisions: 3,
            //     subLength: 0.5,
            //     subWidth: 0.6,
            //     subColor: 'rgba(102, 102, 102, 1)'
            // }
        });

        this.gaugeChart.maxValue = 500;
        this.gaugeChart.setMinValue(0);
        this.gaugeChart.animationSpeed = 60;
        this.gaugeChart.set(0);
    },

    initTempChart() {
        const canvas = Dashboard.elements.donutChartTemp;
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
    /**
     * Do not set the top_range parameter unless 
     * - you want to **STRICTLY** set both the `least` (baseline) and `maximum` (top_range) values. 
     * - The **auto scaling** is `disabled` in that case.
     */
    init2D(elementId, yLabel, useSecondaryFillColor = false, baseline = 0, top_range = 100) {
        // Add baseline trace
        const baselineTrace = {
            name: 'hidden baseline',
            // Init with real large number of points, otherwise you will see graphs as shown in "../../docs/Error.png"
            x: this.generateTimeLabels(largeInitPoints),
            y: new Array(largeInitPoints).fill(baseline),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'rgba(0,0,0,0)',  // Invisible line
                width: 0
            },
            showlegend: false,

            // hoverinfo: 'none'
            hoverinfo: 'x',
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: { color: 'rgba(160, 174, 192, 1)', size: 30 }
            }
        };

        const trace = {
            name: yLabel,
            x: this.generateTimeLabels(largeInitPoints),  // Initial dummy data
            y: new Array(largeInitPoints).fill(0),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: useSecondaryFillColor ? 'rgba(147, 51, 234, 1)' : 'rgba(0, 242, 254, 1)',
                width: 3,
                shape: 'spline'
            },
            // fill: 'tozeroy',
            fill: 'tonexty',
            fillcolor: useSecondaryFillColor ? 'rgba(147, 51, 234, 0.1)' : 'rgba(0, 242, 254, 0.1)',
            showlegend: false,
            // hoverinfo: 'y',    // If you set this, idk why the label on x-axis will move from bottom anchor to right anchor.
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: { color: 'rgba(0, 242, 254, 1)', size: 14 }
            }
        };

        const layout = {
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: {
                color: 'rgba(160, 174, 192, 1)',
                family: 'Inter, sans-serif'
            },
            margin: {
                l: 50, r: 30,
                t: 30, b: 50
            },
            xaxis: {
                // title: 'Time',
                showgrid: true,
                gridcolor: 'rgba(255,255,255,0.1)',
                tickformat: '%H:%M',

                hoverformat: '%H:%M',  // Format for hover timestamp
                // hoverlabel: {
                //     bgcolor: 'rgba(0, 0, 0, 0.8)',
                //     font: {
                //         color: 'rgba(160, 174, 192, 1)',
                //         size: 14
                //     }
                // }
            },
            yaxis: {
                title: yLabel,
                showgrid: true,
                gridcolor: 'rgba(255,255,255,0.1)',
                range: [baseline, top_range],
                // If top range is default (at 100), then enable auto-ranging:
                autorange: (top_range === 100)
            },
        };

        Plotly.newPlot(elementId, [baselineTrace, trace], layout, {
            responsive: true,
            displayModeBar: false
        });

        // Store plot reference:
        this.plots[elementId] = {
            data: [baselineTrace, trace],
            layout
        };
    },

    update2D(elementId, data) {
        if (this.plots[elementId]) {
            const timeLabels = this.generateTimeLabels(data.length);
            Plotly.update(elementId, {
                x: [timeLabels, timeLabels],
                y: [this.plots[elementId].data[0].y, data]
            });
        }
    },

    // ----------------------------------------------------------------
    // 2D - Steam Graph
    // ----------------------------------------------------------------
    initSteamGraph(elementId, ylabel, baseline = 0, top_range = 100) {
        const baselineTrace = {
            name: 'hidden baseline',
            x: this.generateTimeLabels(largeInitPoints),
            y: new Array(largeInitPoints).fill(baseline),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'rgba(0,0,0,0)',  // Invisible line
                width: 0
            },
            showlegend: false,
            hoverinfo: 'x',
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: {
                    color: 'rgba(160, 174, 192, 1)',
                    size: 14
                }
            }
        };

        const trace1 = {
            name: 'Actual Temperature',
            x: this.generateTimeLabels(largeInitPoints),  // Initial dummy data
            y: new Array(largeInitPoints).fill(baseline),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'rgba(0, 242, 254, 1)',
                width: 3,
                shape: 'spline'
            },
            fill: 'tonexty',
            fillcolor: 'rgba(0, 242, 254, 0.1)'
        };

        const trace2 = {
            name: 'Feels Like',
            x: this.generateTimeLabels(largeInitPoints),  // Initial dummy data
            y: new Array(largeInitPoints).fill(baseline),
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'rgba(147, 51, 234, 1)',  // Purple color
                width: 3,
                shape: 'spline'
            },
            fill: 'tonexty',
            fillcolor: 'rgba(147, 51, 234, 0.1)'
        };

        const layout = {
            // title: {
            //     text: title,
            //     font: {
            //         family: 'Inter, sans-serif',
            //         size: 20,
            //         color: 'rgba(160, 174, 192, 1)'
            //     }
            // },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: {
                color: 'rgba(160, 174, 192, 1)',
                family: 'Inter, sans-serif'
            },
            margin: {
                l: 50, r: 30,
                t: 50, b: 50
            },
            xaxis: {
                // title: 'Time',
                showgrid: true,
                gridcolor: 'rgba(255,255,255,0.1)',
                tickformat: '%H:%M'
            },
            yaxis: {
                title: ylabel,
                showgrid: true,
                gridcolor: 'rgba(255,255,255,0.1)',

                range: [baseline, top_range],
                // If top range is default (at 100), then enable auto-ranging:
                autorange: (top_range === 100),
                // autorange: false
            },
            legend: {
                orientation: 'h',
                yanchor: 'bottom',
                y: 1.02,
                xanchor: 'right',
                x: 1
            }
        };

        Plotly.newPlot(elementId, [trace1, trace2], layout, {
            responsive: true,
            displayModeBar: false
        });

        // Store plot reference
        this.plots[elementId] = {
            data: [baselineTrace, trace1, trace2],
            layout
        };
    },

    // Update Steam Graph
    updateSteamGraph(elementId, actualTemp, feelsLikeTemp) {
        if (this.plots[elementId]) {
            const timeLabels = this.generateTimeLabels(actualTemp.length);

            Plotly.update(elementId, {
                x: [timeLabels, timeLabels],
                y: [actualTemp, feelsLikeTemp]
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
    // Remember this is just initialization, you also need to "update" the plots with each data fetch from fetchAndPlotData()

    PlotlyChartSystem.initSteamGraph(
        elementId = 'plot2_temperature', ylabel = 'Temperature (°C)',
        baseline = 25, top_range = 40);

    // PlotlyChartSystem.init2D('plot2_temperature', 'Temperature');
    PlotlyChartSystem.init2D('plot2_humidity', 'Humidity (%)');
    PlotlyChartSystem.init2D('plot2_air_quality', 'Air Quality (ppm)');

    PlotlyChartSystem.init2D(
        elementId = 'plot2_feels_like', ylabel = 'Feels Like Temperature (°C)',
        useSecondaryFillColor = false, baseline = 25);

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
// FB-Live response pre-processor:
// ------------------------------------------------------------------------------

const PreProcessor = {
    // Validate individual reading
    isValidReading(reading) {
        return typeof reading === "object" &&
            !isNaN(reading.temp) &&
            !isNaN(reading.hum) &&
            !isNaN(reading.feel) &&
            !isNaN(reading.mq135) &&
            !isNaN(reading.mq4);
    },

    // Get default readings when no valid data is available
    getDefaultReadings() {
        return {
            temp: 33,
            hum: 67,
            feel: 36,
            mq135: 130,
            mq4: 153
        };
    },

    // Extract readings from current data point
    extractReadings(reading, lastValidReading = null) {
        if (this.isValidReading(reading)) {
            return reading;
        }
        return lastValidReading || this.getDefaultReadings();
    },

    // Initialize arrays for storing processed data
    initializeDataArrays() {
        return {
            bs_temp: [],
            bs_hum: [],
            bs_feel: [],
            bs_mq135: [],
            bs_mq4: [],
            bs_keys: []
        };
    },

    // Process node data and update arrays
    processNodeData(response_node, dataArrays) {
        let lastValidReading = null;

        for (const key in response_node) {
            if (key !== "fire_node" && key !== "gas_node") {
                dataArrays.bs_keys.push(key);

                const reading = this.extractReadings(response_node[key], lastValidReading);

                // Update arrays with readings
                dataArrays.bs_temp.push(reading.temp);
                dataArrays.bs_hum.push(reading.hum);
                dataArrays.bs_feel.push(reading.feel);
                dataArrays.bs_mq135.push(reading.mq135);
                dataArrays.bs_mq4.push(reading.mq4);

                // Update last valid reading if current reading is valid
                if (this.isValidReading(response_node[key])) {
                    lastValidReading = response_node[key];
                }
            }
        }
        return dataArrays;
    },

    // Driver function that orchestrates the preprocessing
    getProcessedResponse(response_node) {
        // Initialize data arrays
        const dataArrays = this.initializeDataArrays();

        // Process the node data
        const processedArrays = this.processNodeData(response_node, dataArrays);

        // Return final processed response
        return {
            ...processedArrays,
            bs_gas: response_node["gas_node"],
            bs_fire: response_node["fire_node"],
            total_length: processedArrays.bs_temp.length
        };
    }
};



// ------------------------------------------------------------------------------
// Play:
// FixMe: Just Trying it, heHe :)
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

// Fetch with some specific init points:
// Console: initPointCount = 1000;
// fetchAndPlotData(isInitialFetch = true);

// ------------------------------------------------------------------------------
// Temp Test:
// ------------------------------------------------------------------------------