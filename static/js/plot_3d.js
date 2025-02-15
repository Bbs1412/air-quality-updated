function plot3D(elementId, xData, yData, zData, xLabel, yLabel, zLabel) {
    var trace = {
        x: xData,
        y: yData,
        z: zData,
        mode: 'markers',
        marker: {
            color: 'rgb(23, 190, 207)',
            size: 12,
            line: { color: 'rgba(217, 217, 217, 0.14)', width: 0.5 },
            opacity: 0.8
        },
        type: 'scatter3d'
    };

    var layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'black',
        scene: {
            xaxis: { color: 'white', title: xLabel },
            yaxis: { color: 'white', title: yLabel },
            zaxis: { color: 'white', title: zLabel }
        }
    };

    Plotly.newPlot(elementId, [trace], layout);
}


// Example calls replacing previous functions:
// plot3D('mydiv', bs_feel, bs_hum, bs_mq135, 'Temperature Feel', 'Humidity', 'Air Quality');
// plot3D('Div', bs_temp, bs_hum, bs_feel, 'Temperature', 'Humidity', 'Feels Like Temperature');

function plot3Dv2(elementId, xData, yData, zData, xLabel, yLabel, zLabel, palette) {
    const trace = {
        type: 'scatter3d',
        mode: 'markers',
        x: xData,
        y: yData,
        z: zData,
        marker: {
            size: 11,
            color: zData,
            colorscale: palette ? palette : 'Viridis',
            opacity: 0.8
        }
    };

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            xaxis: {
                title: xLabel,
                gridcolor: 'rgba(255,255,255,0.1)',
                showbackground: true,
                backgroundcolor: 'rgba(0,0,0,0)'
            },
            yaxis: {
                title: yLabel,
                gridcolor: 'rgba(255,255,255,0.1)',
                showbackground: true,
                backgroundcolor: 'rgba(0,0,0,0)'
            },
            zaxis: {
                title: zLabel,
                gridcolor: 'rgba(255,255,255,0.1)',
                showbackground: true,
                backgroundcolor: 'rgba(0,0,0,0)'
            },
            camera: {
                // eye: { x: 1.5, y: 1.5, z: 0.5 }
                eye: { x: 0.8, y: 0.8, z: 0.2 }
            }
        },
        margin: {
            l: 0,
            r: 0,
            t: 0,
            b: 0
        }
    };

    Plotly.newPlot(elementId, [trace], layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    });
}
