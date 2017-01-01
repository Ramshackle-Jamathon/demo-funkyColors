import createShader from "gl-shader";
import createBuffer from "gl-buffer";
import vertexShader from "./shaders/scene.vert";
import fragmentShader from "./shaders/scene.frag";
import Stats from "stats.js";
import glTexture2d from "gl-texture2d";


const webcam = {
	stream: undefined,
	hasUserMedia: false,
	video: document.createElement("video"),
	requestUserMedia: function() {
		navigator.getUserMedia = navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia ||
			navigator.msGetUserMedia;

		let handleUserMedia = (error, stream) => {
			if (error) {
				console.error(error);
				return;
			}
			this.video.src = window.URL.createObjectURL(stream);
			this.stream = stream;
			this.hasUserMedia = true;
		};

		let sourceSelected = (audioSource, videoSource) => {
			let constraints = {
				video: {
					// width: { min: this.width, ideal: this.width },
					// height: { min: this.height, ideal: this.height},
					optional: [{sourceId: videoSource}]
				}
			};

			if (false) {
				constraints.audio = {
					optional: [{sourceId: audioSource}]
				};
			}

			navigator.getUserMedia(constraints, (stream) => {
				handleUserMedia(null, stream);
			}, (e) => {
				instance.handleUserMedia(e);
			});
		};

		if (this.audioSource && this.videoSource) {
			sourceSelected(this.audioSource, this.videoSource);
		} else {
			if ("mediaDevices" in navigator) {
				navigator.mediaDevices.enumerateDevices().then((devices) => {
					let audioSource = null;
					let videoSource = null;

					devices.forEach((device) => {
						if (device.kind === "audio") {
							audioSource = device.id;
						} else if (device.kind === "video") {
							videoSource = device.id;
						}
					});

					sourceSelected(audioSource, videoSource);
				})
				.catch((error) => {
					console.log(`${error.name}: ${error.message}`); // eslint-disable-line no-console
				});
			} else {
				MediaStreamTrack.getSources((sources) => {
					let audioSource = null;
					let videoSource = null;

					sources.forEach((source) => {
						if (source.kind === "audio") {
							audioSource = source.id;
						} else if (source.kind === "video") {
							videoSource = source.id;
						}
					});

					sourceSelected(audioSource, videoSource);
				});
			}
		}
	}
};

const demo = {
	stats: new Stats(),
	defaultQuality: 1,
	quality: 1,
	shader: undefined,
	buffer: undefined,
	lastTimeStamp: 0,
	startTime: undefined,
	ellapsedTime: undefined,
	gl: undefined,
	webcam,
	canvas: document.body.appendChild(document.createElement("canvas")),
	ui: document.body.appendChild(document.createElement("input")),
	createContext: function(){
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.canvas.style.position = "absolute";
		this.gl = (
			this.canvas.getContext("webgl") ||
			this.canvas.getContext("webgl-experimental") ||
			this.canvas.getContext("experimental-webgl")
		);
		if (!this.gl) {
			throw new Error("Unable to initialize gl");
		}
	},
	render: function(dt){

		//Bind shader
		this.gl.enableVertexAttribArray(this.shader.attributes.vertexPositionNDC);
		this.gl.vertexAttribPointer(this.shader.attributes.vertexPositionNDC, 2, this.gl.FLOAT, false, 0, 0);
		this.shader.bind();

		//Bind buffer
		this.buffer.bind();

		//Set attributes
		if(this.webcam.video.readyState === this.webcam.video.HAVE_ENOUGH_DATA) {
			if(this.webcamTexture) {
				this.webcamTexture.setPixels(this.webcam.video);
			} else {
				this.webcamTexture = glTexture2d(this.gl, this.webcam.video);
				this.webcamTexture.magFilter = this.gl.LINEAR;
				this.webcamTexture.minFilter = this.gl.LINEAR;
			} 
			this.shader.uniforms.uWebcamTexture = this.webcamTexture.bind();
		}
		//Set uniforms
		this.shader.uniforms.uResolution = [this.canvas.width, this.canvas.height];
		this.shader.uniforms.uGlobalTime = this.ellapsedTime / 1000;
		this.shader.uniforms.uColorInterpolateStep = this.ui.value;

		//Draw
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
	},
	loop: function(timeStamp){
		this.stats.begin();
		if (!this.startTime) {
			this.startTime = timeStamp;
		}
		this.ellapsedTime = timeStamp - this.startTime;
		var dt = timeStamp - this.lastTimeStamp;
		this.lastTimeStamp = timeStamp;

		if (this.ellapsedTime < 5000 && dt > 45.0){
			this.quality = this.quality - 0.01;
			this.resizeCanvas();
		}
		this.render(dt);
		this.stats.end();
		window.requestAnimationFrame(this.loop.bind(this));
	},
	resizeCanvas: function(){
		this.gl.canvas.width = window.innerWidth * this.quality;
		this.gl.canvas.height = window.innerHeight * this.quality;
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	},
	resize: function(){
		const canvas = this.gl.canvas;
		this.quality = this.defaultQuality;
		const displayWidth  = window.innerWidth * this.quality;
		const displayHeight = window.innerHeight * this.quality;

		if (canvas.width  !== displayWidth || canvas.height !== displayHeight) {
			this.startTime = 0;
			this.resizeCanvas();
		}
	},
	keydown: function(event){
		if ( event.altKey ) {
				return;
		}
		event.preventDefault();
		if( event.shiftKey ){
			switch ( event.keyCode ) {
				case 187: /* + */ this.quality += 0.05; this.resizeCanvas(); break;
				case 189: /* - */ this.quality -= 0.05; this.resizeCanvas(); break;
			}
		}
	},
	init: function(){
		this.createContext();
		this.resizeCanvas();
		this.ui.setAttribute("type", "range");
		this.ui.setAttribute("min", "0");
		this.ui.setAttribute("max", "5");
		this.ui.style.position = "absolute";
		this.ui.style.right = "0";
		this.ui.value = 1.0;
		this.ui.step = 0.1;
		this.webcam.requestUserMedia();
		
		document.body.appendChild( this.stats.dom );
		//Create full screen vertex buffer
		this.buffer = createBuffer(this.gl, [
			// First triangle:
			 1.0,  1.0,
			-1.0,  1.0,
			-1.0, -1.0,
			// Second triangle:
			-1.0, -1.0,
			 1.0, -1.0,
			 1.0,  1.0
		]);

		//Create shader
		this.shader = createShader(
			this.gl,
			vertexShader,
			fragmentShader
		);

		window.addEventListener("resize", this.resize.bind(this)); 
		window.addEventListener("keydown", this.keydown.bind(this));
		window.requestAnimationFrame(this.loop.bind(this));
	}
}
demo.init();
