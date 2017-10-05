var scene, camera, renderer, composer, geometry, shape, material, glitchPass, dotScreen, rgbShift;
var audioContext, analyser, freqData, meter;
var threshold;

var WIDTH  = window.innerWidth;
var HEIGHT = window.innerHeight;

var SPEED = 0.075;
var SPX;
var SPY;
var SPZ;

var MESH_LIST = [	
					new THREE.CubeGeometry(32, 32, 32), 
					new THREE.CubeGeometry(16, 16, 16), 
					new THREE.SphereGeometry(32, 32, 16), 
					new THREE.SphereGeometry(16, 16, 8),
					new THREE.TetrahedronGeometry(32),
					new THREE.TetrahedronGeometry(16),
					new THREE.TorusKnotGeometry(18, 6, 100, 16),
					new THREE.TorusKnotGeometry(9, 3, 100, 16),
					new THREE.DodecahedronGeometry(32),
					new THREE.DodecahedronGeometry(16)
				]

var BG_COLOUR = [
					0x000000,
					0xffffff
				]

window.onload = function() {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	audioContext = new AudioContext();

	try {
		navigator.getUserMedia = navigator.getUserMedia ||
									navigator.webkitGetUserMedia ||
									navigator.mozGetUserMedia;

		navigator.getUserMedia(
		{
			"audio": {
				"mandatory": {
					"googEchoCancellation": "false",
					"googAutoGainControl": "false",
					"googNoiseSuppression": "false",
					"googHighpassFilter": "false",
				},
				"optional": []
			},
		}, streamSuccess, streamFail);
	} 
	catch (e) {
		alert('getUserMedia exception:' + e);
	}
}

document.onkeypress = function(e) {
	console.log(e.keyCode);
	// x
	if (e.keyCode == 120) {
		document.getElementById('thresholdSlider').value = Number(document.getElementById('thresholdSlider').value) + 0.05;
	}
	// z
	else if (e.keyCode == 122) {
		document.getElementById('thresholdSlider').value -= 0.05;
	}
	// c
	else if (e.keyCode == 99) {
		glitchPass.enabled = !glitchPass.enabled;
	}
	// v
	else if (e.keyCode == 118) {
		glitchPass.curF = 0;
	}
	// b
	else if (e.keyCode == 98) {
		if (document.getElementById('info').style.display == 'none') {
			document.getElementById('info').style.display = 'block';
			document.getElementById('footer').style.display = 'block';

		}
		else {
			document.getElementById('info').style.display = 'none';
			document.getElementById('footer').style.display = 'none';
		}
	}
	// space
	else if (e.keyCode == 32) {
		scene.remove(shape);
		addShape(Math.floor(Math.random() * MESH_LIST.length));
	}
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function streamSuccess(stream) {
	mediaStreamSource = audioContext.createMediaStreamSource(stream);

	analyser = audioContext.createAnalyser();
	mediaStreamSource.connect(analyser);

	meter = createAudioMeter(audioContext);
	analyser.connect(meter);

	freqData = new Uint8Array(analyser.frequencyBinCount);

	render();
}
function streamFail() {
	alert('Fatal error: could not get audio.');
}

function addShape(index) {
	geometry = MESH_LIST[index];

	if (Math.random() > 0.6) {
		var mesh = new THREE.EdgesGeometry(geometry);
		material = new THREE.LineBasicMaterial({color: 0x00ff00});
		shape = new THREE.LineSegments(mesh, material);
	}
	else {
		if (Math.random() > 0.5) {
			material = new THREE.PointsMaterial({color: 0x00ff00, size: 0.5});
			shape = new THREE.Points(geometry, material);
		}
		else {
			material = new THREE.MeshBasicMaterial({color: 0xff0000});
			shape = new THREE.Mesh( geometry, material );

			var geo = new THREE.WireframeGeometry(shape.geometry);
			var mat = new THREE.LineBasicMaterial({color: 0xffffff});
			var wireframe = new THREE.LineSegments(geo, mat);
			shape.add(wireframe);
		}
	}

	material.color.r = Math.random();
	material.color.g = Math.random();
	material.color.b = Math.random();

	SPX = SPEED * (Math.random() - 0.5);
	SPY = SPEED * (Math.random() - 0.5);
	SPZ = SPEED * (Math.random() - 0.5);

	scene.add(shape);
}

function init() {
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(WIDTH, HEIGHT);
	document.body.appendChild(renderer.domElement);

	renderer.setClearColor(BG_COLOUR[0]);

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
	camera.position.set(0, 0, 100);
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	addShape(0);

	composer = new THREE.EffectComposer(renderer);
	composer.addPass(new THREE.RenderPass(scene, camera));

	glitchPass = new THREE.GlitchPass();
	// glitchPass.renderToScreen = true;
	composer.addPass(glitchPass);

	dotScreen = new THREE.ShaderPass( THREE.DotScreenShader );
	dotScreen.uniforms['scale'].value = 4;
	composer.addPass(dotScreen);
	dotScreen.enabled = false;

	rgbShift = new THREE.ShaderPass( THREE.RGBShiftShader );
	rgbShift.uniforms['amount'].value = 0.0025;
	rgbShift.renderToScreen = true;
	composer.addPass(rgbShift);

	var directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
	directionalLight.position.set(0, 0, 100);
	directionalLight.position.normalize();
	directionalLight.target.position.set(0, 0, 0);
	scene.add(directionalLight);
}

function render() {
	requestAnimationFrame(render);
	geometry.verticesNeedUpdate = true;

	var threshold = document.getElementById('thresholdSlider').value;
	document.getElementById('thresholdVal').innerText = Number(threshold).toFixed(2);
	document.getElementById('volumeVal').innerText = meter.volume;
	document.getElementById('bar').style.width = (meter.volume * 100) + "%";
	document.getElementById('thresholdIndicator').style.left = (threshold * 100) + "%";

	analyser.getByteFrequencyData(freqData);
	// console.log(freqData);

	var relativeLevel = meter.volume / threshold;

	shape.rotation.x += SPX;
	shape.rotation.y += SPY;
	shape.rotation.z += SPZ;

	// console.log(glitchPass.uniforms.distortion_x.value, glitchPass.uniforms.distortion_y.value);

	if (meter.volume > threshold) {
		scene.remove(shape);
		addShape(Math.floor(Math.random() * MESH_LIST.length));

		if (Math.random() < 0.1) {
			dotScreen.enabled = !dotScreen.enabled;
		}

		if (meter.volume > (threshold + 0.1)) {
			glitchPass.curF = 0;
		}
		else {
			glitchPass.curF = 25;
		}
	}
	rgbShift.uniforms['amount'].value = 0.01 * relativeLevel;
	composer.render();
}

init();