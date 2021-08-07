// const { EventEmitter } = require('events');
/* Uncomment the previous line if `aud_player.js` is not imported before importing this module */ 

class Microphone extends EventEmitter {
	constructor(sampleRate = 16000) {
		super();

		this.rawStream = null;
		this.stream = null;
		this.audioProcessor = null;

		this.audioContext = new AudioContext();
		this.bufferSize = 4096;

		this.sampleRate = sampleRate;

		this.open();
	}

	/**
	 * Opens & initializes the Microphone stream from the browser
	 */
	open() {
		navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false,
		}).then((rawStream) => {
			this.rawStream = rawStream;
			this.stream = this.audioContext.createMediaStreamSource(this.rawStream);

			this.audioProcessor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
			this.audioProcessor.onaudioprocess = event => this.onAudioProcess(event);

			this.stream.connect(this.audioProcessor);
			this.audioProcessor.connect(this.audioContext.destination);
			this.emit('ready');
		});
	}

	/**
	 * Enables the microphone for streaming
	 */
	start() {
		this.enabled = true;
	}

	/**
	 * Disables the microphone from streaming
	 */
	stop() {
		this.enabled = false;
	}

	/**
	 * Processes the audio to be ready for Google.
	 *
	 * @param event event
	 */
	onAudioProcess(event) {
		if (!this.enabled) return;

		let data = event.inputBuffer.getChannelData(0);
		data = this.downsampleBuffer(data);
		// [TODO]: Implement piping?
		this.emit('data', data);
	}

	/**
	 * Downsamles the buffer if needed to right sampleRate & converts the data into an int16 buffer
	 *
	 * @param buffer buffer
	 */
	downsampleBuffer(buffer) {
		if (this.audioContext.sampleRate === this.sampleRate) {
			return buffer;
		}
		const sampleRateRatio = this.audioContext.sampleRate / this.sampleRate;
		const newLength = Math.round(buffer.length / sampleRateRatio);
		const result = new Int16Array(newLength);
		let offsetResult = 0;
		let offsetBuffer = 0;
		while (offsetResult < result.length) {
			const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
			let accum = 0;
			let count = 0;
			for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
				accum += buffer[i];
				count += 1;
			}
			result[offsetResult] = Math.min(1, accum / count) * 0x7FFF;
			offsetResult += 1;
			offsetBuffer = nextOffsetBuffer;
		}
		return result.buffer;
	}
}