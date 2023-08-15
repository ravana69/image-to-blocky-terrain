window.addEventListener("DOMContentLoaded",app);

function app() {
	var form = document.querySelector("form"),
		imgUpload = document.getElementsByName("img_upload")[0],
		imgName = document.getElementsByName("img_name")[0],
		maxHeightRange = document.getElementsByName("max_height")[0],
		maxHeightNumber = document.getElementsByName("max_height")[1],
		resetCamBtn = document.getElementsByName("reset_camera")[0],
		canvas = document.createElement("canvas"),
		c = canvas.getContext("2d"),
		scene,
		renderer,
		camera,
		camControls,
		img = null,
		worldHeight = +maxHeightRange.value,
		worldSize = 64,
		terrainGeo = new THREE.Geometry(),
		terrainYPoints = [],

		adjustWindow = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth,window.innerHeight);
		},
		changeMaxHeight = function() {
			// keep input within range
			if (+this.value > this.max)
				this.value = this.max;

			else if (+this.value < this.min)
				this.value = this.min;

			// dynamically update values
			worldHeight = this.value;
			maxHeightRange.value = worldHeight;
			maxHeightNumber.value = worldHeight;

			refreshTerrain();
		},
		getLightness = (R,G,B) => {
			let r = R / 255,
				g = G / 255,
				b = B / 255,
				cmin = Math.min(r,g,b),
				cmax = Math.max(r,g,b),
				light = (cmax + cmin) / 2;

			return light;
		},
		handleImgUpload = e => {
			return new Promise((resolve,reject) => {
				let target = !e ? imgUpload : e.target;
				if (target.files.length) {
					let reader = new FileReader();
					reader.onload = e2 => {
						img = new Image();
						img.src = e2.target.result;
						img.onload = () => {
							resolve();
						};
						img.onerror = () => {
							img = null;
							reject("Image nullified due to file corruption or non-image upload");
						};
						imgName.placeholder = target.files[0].name;
					};
					reader.readAsDataURL(target.files[0]);
				}
			});
		},
		imgUploadValid = () => {
			let files = imgUpload.files,
				fileIsThere = files.length > 0,
				isImage = files[0].type.match("image.*"),
				valid = fileIsThere && isImage;

			return valid;
		},
		init = () => {
			// setup
			scene = new THREE.Scene();
			renderer = new THREE.WebGLRenderer({
				antialias: true
			});
			renderer.setClearColor(new THREE.Color(0x8ca1ff));
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.shadowMap.enabled = true;

			// camera
			camera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.1,1000);
			camera.position.set(0,16,16);
			camera.lookAt(scene.position);
			camControls = new THREE.OrbitControls(camera,renderer.domElement);
			camControls.minDistance = 16;
			camControls.maxDistance = 128;
			camControls.maxPolarAngle = Math.PI / 2;
			
			// initial canvas image
			let initImg = c.createLinearGradient(
				worldSize*0.25,0,
				worldSize*0.75,worldSize
			);
			initImg.addColorStop(0,"hsl(0,0%,100%)");
			initImg.addColorStop(1,"hsl(0,0%,20%)");
			c.fillStyle = initImg;
			c.fillRect(0,0,worldSize,worldSize);
	
			let cImageData = c.getImageData(0,0,worldSize,worldSize),
				cPixels = cImageData.data;

			// terrain
			let textureLoader = new THREE.TextureLoader(),
				terrainMat = new THREE.MeshLambertMaterial({
					color: 0xffffff,
					map: textureLoader.load("https://i.ibb.co/SmvMpbs/grass-block.png")
				});
			terrainMat.map.wrapS = THREE.RepeatWrapping;
			terrainMat.map.wrapT = THREE.RepeatWrapping;
			terrainMat.map.minFilter = THREE.NearestMipMapNearestFilter;
			terrainMat.map.magFilter = THREE.NearestFilter;
			terrainMat.map.repeat.set(1,1);
			
			for (let z = 0; z < worldSize; ++z) {
				for (let x = 0; x < worldSize; ++x) {
					// supply vertices
					let center = worldSize/2 - 0.5,
						i = (worldSize * z) + x,
						ch = i*4,
						red = cPixels[ch],
						green = cPixels[ch + 1],
						blue = cPixels[ch + 2],
						lightness = getLightness(red,green,blue),
						terrainElevation = Math.round(worldHeight * lightness),
						ptX = x - center,
						ptY = terrainElevation,
						ptZ = z - center;

					terrainGeo.vertices.push(
						new THREE.Vector3(ptX - 0.5,0,ptZ - 0.5),
						new THREE.Vector3(ptX + 0.5,0,ptZ - 0.5),
						new THREE.Vector3(ptX - 0.5,0,ptZ + 0.5),
						new THREE.Vector3(ptX + 0.5,0,ptZ + 0.5),
						new THREE.Vector3(ptX - 0.5,ptY,ptZ - 0.5),
						new THREE.Vector3(ptX + 0.5,ptY,ptZ - 0.5),
						new THREE.Vector3(ptX - 0.5,ptY,ptZ + 0.5),
						new THREE.Vector3(ptX + 0.5,ptY,ptZ + 0.5)
					);
					terrainYPoints.push(ptY);
				}
			}
			terrainGeo.computeVertexNormals();

			for (let z = 0; z < worldSize; ++z) {
				for (let x = 0; x < worldSize; ++x) {
					// draw faces
					let zStart = worldSize * 8 * z,
						xStart = 8 * x,
						start = zStart + xStart,
						// corners
						_0 = start,
						_1 = start + 1,
						_2 = start + 2,
						_3 = start + 3,
						_4 = start + 4,
						_5 = start + 5,
						_6 = start + 6,
						_7 = start + 7;

					terrainGeo.faces.push(
						new THREE.Face3(_4,_5,_1),
						new THREE.Face3(_1,_0,_4),
						new THREE.Face3(_6,_4,_0),
						new THREE.Face3(_0,_2,_6),
						new THREE.Face3(_5,_7,_3),
						new THREE.Face3(_3,_1,_5),
						new THREE.Face3(_7,_6,_2),
						new THREE.Face3(_2,_3,_7),
						new THREE.Face3(_5,_4,_6),
						new THREE.Face3(_6,_7,_5)
					);
					// supply vertex UVs to allow texture use
					for (let f = 0; f < 10; ++f) {
						let uvs = terrainGeo.faceVertexUvs[0],
							repeatX = f < 8 ? terrainYPoints[(worldSize * z) + x] : 1;
						if (f % 2 === 0)
							uvs.push([
								new THREE.Vector2(0,0),
								new THREE.Vector2(0,1),
								new THREE.Vector2(repeatX,1)
							]);
						else
							uvs.push([
								new THREE.Vector2(repeatX,1),
								new THREE.Vector2(repeatX,0),
								new THREE.Vector2(0,0)
							]);
					}
				}
			}
			terrainGeo.uvsNeedUpdate = true;
			terrainGeo.computeFaceNormals();

			let terrain = new THREE.Mesh(terrainGeo,terrainMat);
			terrain.name = "Terrain";
			terrain.receiveShadow = true;
			scene.add(terrain);

			// lighting
			let ambientLight = new THREE.AmbientLight(0xffffff,0.75);
			ambientLight.name = "Ambient Light";
			scene.add(ambientLight);

			let backLight = new THREE.DirectionalLight(0xffffff,0.25),
				halfWorld = worldSize/2;
			backLight.name = "Back Light";
			backLight.position.set(0,halfWorld,-halfWorld);
			scene.add(backLight);

			let frontLight = backLight.clone();
			frontLight.name = "Front Light";
			frontLight.position.z *= -1;
			scene.add(frontLight);

			// render
			let body = document.body;
			body.insertBefore(renderer.domElement,body.childNodes[4]);
			renderScene();

			// deal with preserved input
			if (imgUpload.value != "")
				renderPromise();
		},
		renderPromise = e => {
			handleImgUpload(e).then(() => {
				if (imgUploadValid()) {
					updateCanvas();
					refreshTerrain();
				}
			}).catch(msg => {
				console.log(msg);
			});
		},
		refreshTerrain = () => {
			if (updateYPoints()) {
				updateVertices();
				updateUvs();
			}
		},
		renderScene = () => {
			renderer.render(scene,camera);
			requestAnimationFrame(renderScene);
		},
		updateCanvas = () => {
			// restrict image size, keep it proportional
			let imgWidth = img.width,
				imgHeight = img.height;

			if (imgWidth >= imgHeight) {
				if (imgWidth >= worldSize) {
					// overflow left and right
					imgHeight = worldSize;
					imgWidth = imgHeight * (img.width / img.height);
				}
			} else {
				if (imgHeight >= worldSize) {
					// overflow top and bottom
					imgWidth = worldSize;
					imgHeight = imgWidth * (img.height / img.width);
				}
			}
			// update canvas with image in center
			let imgX = worldSize/2 - imgWidth/2,
				imgY = worldSize/2 - imgHeight/2;

			c.clearRect(0,0,worldSize,worldSize);
			c.drawImage(img,imgX,imgY,imgWidth,imgHeight);
		},
		updateUvs = () => {
			terrainYPoints.forEach((yPos,i) => {
				for (var f = 0; f < 10; ++f) {
					if (f < 8) {
						let faceVertices = terrainGeo.faceVertexUvs[0][i * 10 + f];
						if (f % 2 === 0) {
							faceVertices[0].set(0,0);
							faceVertices[1].set(0,1);
							faceVertices[2].set(yPos,1);
						} else {
							faceVertices[0].set(yPos,1);
							faceVertices[1].set(yPos,0);
							faceVertices[2].set(0,0);
						}
					}
				}
			});
			terrainGeo.uvsNeedUpdate = true;
		},
		updateVertices = () => {
			terrainYPoints.forEach((yPos,i) => {
				for (let v = 4; v < 8; ++v)
					terrainGeo.vertices[i * 8 + v].y = yPos;
			});
			terrainGeo.verticesNeedUpdate = true;
		},
		updateYPoints = () => {
			// obtain canvas pixels
			let imgData = c.getImageData(0,0,worldSize,worldSize),
				data = imgData.data,
				changeFound = false;

			for (let i = 0; i < data.length; i += 4) {
				// get color and lightness from each canvas pixel
				let red = data[i],
					green = data[i + 1],
					blue = data[i + 2],
					alpha = data[i + 3],
					pixelID = i / 4,
					lightness = getLightness(red,green,blue),
					terrainElevation = Math.round(worldHeight * lightness);

				// reserve height of 1 for clear pixels
				if (alpha === 0) {
					terrainElevation = 1;
				} else {
					// so lowest max hight shall be used for opaque pitch black
					let heightMin = +maxHeightRange.min;
					if (terrainElevation < heightMin)
						terrainElevation = heightMin;
				}
				// update terrain y-points
				let point = terrainYPoints[pixelID];
				if (point !== terrainElevation) {
					terrainYPoints[pixelID] = terrainElevation;
					changeFound = true;
				}
			}
			return changeFound;
		};

	init();
	imgUpload.addEventListener("change",renderPromise);
	maxHeightRange.addEventListener("input",changeMaxHeight);
	maxHeightNumber.addEventListener("input",changeMaxHeight);
	resetCamBtn.addEventListener("click",camControls.reset);
	window.addEventListener("resize",adjustWindow);
}