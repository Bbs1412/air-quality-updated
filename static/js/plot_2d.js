function plotData(elementId, data, yLabel) {
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

    var trace = {
        x: xValues,
        y: data,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: 'white', size: 3 },
        line: { color: 'lightgreen' }
    };

    var layout = {
        plot_bgcolor: 'black',
        paper_bgcolor: 'black',
        xaxis: {
            color: 'white',
            title: 'Time',
            tickvals: ["0:00", "4:00", "8:00", "12:00", "16:00", "20:00", "23:59"]
        },
        yaxis: { color: 'white', title: yLabel }
    };

    Plotly.newPlot(elementId, [trace], layout);
}


// Sample call to plotData:
// const bs_temp = [20, 22, 24, 26, 28, 30, 32, 34, 36, 38];  
// plotData('temp', bs_temp, 'Temperature');


function plotData2(elementId, data, yLabel) {
    const trace = {
        x: generateTimeLabels(data.length),
        y: data,
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
            l: 50,
            r: 30,
            t: 30,
            b: 50
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
}

function generateTimeLabels(count) {
    const labels = [];
    const now = new Date();
    const interval = 24 * 60 / count;

    for (let i = 0; i < count; i++) {
        const time = new Date(now - (count - i) * interval * 60000);
        labels.push(time);
    }

    return labels;
}
