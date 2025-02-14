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