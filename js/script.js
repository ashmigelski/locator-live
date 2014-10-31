/** Main app logic
 */
var app = (function () {

	var self = this;
	/** @private */
	var map = null,
		session = null,
		overlay = null,
		unitsData = {};

	/** Print message to log
	 */
	function msg(text) {
		console.log(text);
	}

	/** Random color generator
	 */
	function getRandomColor() {
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}

	/** Execute after login succeed
	 */
	function init() {
		var flags =
			wialon.item.Item.dataFlag.base |
			wialon.item.Item.dataFlag.images |
			wialon.item.Unit.dataFlag.messageParams;

		session.loadLibrary('itemIcon'); // load Icon Library
		session.updateDataFlags( // load items to current session
			[{type: 'type', data: 'avl_unit', flags: flags, mode: 0}], // items specification
			function (code) { // updateDataFlags callback
				if (code) {
					msg(wialon.core.Errors.getErrorText(code));
				} else {
					showUnits();
				}
		});
	}

	/** Show units on map and bind event
	 */
	function showUnits(){
		// get loaded 'avl_units's items
		var units = session.getItems('avl_unit');
		// check if units found
		if (!units || !units.length){
			msg('Units not found');
			return;
		}
		var bounds = [];
		var markerList = [];
		for (var i = 0, params = null, pos = null, s = null, data = {}, marker = null; i< units.length; i++) {
			params = units[i].getMessageParams(); // get unit state
			pos = params['posinfo'];
			// check if map created and we can detect position of unit
			if (map && pos && pos.v) {
				// add point to bounds
				bounds.push([pos.v.y, pos.v.x]);
				var icon = L.icon({
					iconUrl: units[i].getIconUrl(32),
					iconAnchor: [16, 16]
				});
				s = params['speed'] ? params['speed'].v : 'n/a';
				marker = L.marker({lat: pos.v.y, lng: pos.v.x}, {icon: icon})
							.bindPopup(units[i].getName() + '<div>Speed: <b>' + s + '</b> kph</div>');

				// construct data to store it and reuse
				unitsData[units[i].getId()] = {
					marker: marker, //.addTo(map)
					tail: L.polyline([{lat: pos.v.y, lng: pos.v.x}], {color: getRandomColor(), opacity: 0.8})
							.addTo(map)
				};

				markerList.push(unitsData[units[i].getId()].marker);
			}
			// register event listener
			units[i].addListener('changeMessageParams', handleParamsChange);
		}
		// fit bounds to show all units
		// !!! UNCOMENT IF YOU WANT TO SEE ALL UNITS
		// map.fitBounds(bounds);

		var markers = L.markerClusterGroup({
			chunkedLoading: true,
			//chunkProgress: updateProgressBar,
			disableClusteringAtZoom: 17
		});
		markers.addLayers(markerList);
		map.addLayer(markers);
	}

	/** Cluster progress
	 */
	function updateProgressBar(processed, total, elapsed, layersArray) {
		if (elapsed > 1000) {
			// if it takes more than a second to load, display the progress bar:
			//progress.style.display = 'block';
			//progressBar.style.width = Math.round(processed/total*100) + '%';
			console.info('clustering:', Math.round(processed / total * 100) + '%');
		}

		if (processed === total) {
			// all markers processed - hide the progress bar:
			//progress.style.display = 'none';
			console.info('clustering: Done!');
		}
	}

	/** Message parameters event handler
	 * @param {Event} event
	 */
	function handleParamsChange(event) {
		// get data from event
		var data = event.getData();
		var pos = data['posinfo'];
		if (pos) {
			var unit = event.getTarget();
			if (unit.getId() in unitsData) {
				// move marker
				var marker = unitsData[unit.getId()].marker;
				marker.setLatLng({lat: pos.v.y, lng: pos.v.x});
				// update marker content
				if (marker.getPopup() && data['speed']) {
					marker.getPopup().setContent(
						unit.getName() + '<div>Speed: <b>' + data['speed'].v + '</b> kph</div>'
					).update();
				}
				// add point to tail
				unitsData[unit.getId()].tail.addLatLng({lat: pos.v.y, lng: pos.v.x});
				// remove oldest point if tail too long
				if (unitsData[unit.getId()].tail.getLatLngs().length > 10) {
					unitsData[unit.getId()].tail.spliceLatLngs(0, 1);
				}
			}
		}
	}

	/** App login
	 * @param {String} user   wialon username (@default: 'Cebit')
	 * @param {String} password   password (@default: 'cebit')
	 * @param {String} url   serher host url (@default: 'https://hst-api.wialon.com')
	 */
	self.login = function (user, password, url) {
		user = user || 'Cebit';
		password = password || 'cebit';
		url = url || 'https://hst-api.wialon.com';
		if (wialon) {
			session = wialon.core.Session.getInstance();
			session.initSession(url); // init session
			session.login(user, password, '', function (code) { // login callback
				// if error code - print error message
				if (code) {
					msg(wialon.core.Errors.getErrorText(code));
				} else {
					msg('Logged successfully');
					// hide overlay
					document.getElementById('overlay').style.display = 'none';
					// when login succeed then run init() function
					init();
				}
			});
		} else {
			msg('wialon.js load error');
		}
	};

	/** App initializition
	 *  Executes after DOM loaded
	 */
	self.initialize = function () {
		// bind login function to click
		document.getElementById('loginBtn').onclick = function () {
			var user = document.getElementById('username').value;
			var password = document.getElementById('password').value;
			self.login(user, password);
		};
		// create a map in the "map" div
		map = L.map('map').setView([52.32728615559, 9.798388481140], 14);
		// add an OpenStreetMap tile layer
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);
	};

	// public access
	this.getUnitsData = function () {
		return unitsData;
	}
	this.getMap = function () {
		return map;
	};

	return self;
})();
