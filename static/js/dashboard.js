const last_updated = document.getElementById("last_updated");

function updateReadings(temp, hum, aq) {
  const dash_temp = document.getElementById('dash_temp');
  const dash_aq = document.getElementById('dash_aq');
  const dash_hum = document.getElementById('dash_hum');

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

updateReadings(35.3, 87, 170);