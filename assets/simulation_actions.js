var flwebgl;
(function (flwebgl) {
	(function (actions) {
		actions.sc_Scene321_1_0 = function() {
				/* Mouse Click Event
				Clicking on the specified symbol instance executes a function in which you can add your own custom code.
			
				Instructions:
				1. Add your custom code on a new line after the line that says "// Start your custom code" below.
				The code will execute when the symbol instance is clicked.
				*/
			
				//Get a reference to the Symbol on Stage using its Instance Name
				this.work = this.getChildByName("work");
				this.defend = this.getChildByName("defend");
				//this.attack = this.getChildByName("attack");
				this.spawn = this.getChildByName("spawn");
				this.select = this.getChildByName("select");
				//this.bunny1 = this.getChildByName("bunny1");
				//this.bus = this.getChildByName("bus");
				//this.bunny2 = this.getChildByName("bunny2");
				//this.bunny3 = this.getChildByName("bunny3");
				this.bunnies = {};
				this.selectedBunnies = [];
			
				var SELECT = 0;
				var MOVE = 1;
				var SPAWN = 2;
				var SET_HOME = 3;
				var SET_WORK = 4;
				this.mode = SELECT;
			
				var WALK = 0;
				var DRIVE = 1;
			
				var ANIM_SPEED = 8;
			
				function applyTransform(clip) {
					if(clip._transform.s > 0)
						clip.setLocalTransform(new flwebgl.geom.Matrix([clip._transform.s, 0, 0, clip._transform.s, clip._transform.x, clip._transform.y]));
					else
						clip.setLocalTransform(new flwebgl.geom.Matrix([clip._transform.s, 0, 0, -clip._transform.s, clip._transform.x, clip._transform.y]));
				}
				
				this.pathfinder = function (start, target, callback) {
					simulator.onmessage = function (e) {
						simulator.onmessage = null;
						callback(e.data);
					};
					
					simulator.postMessage( { func: 'pathfinder', arguments: [ start, target ] } );
				}
				
				this.lines = [];
				this.lines2 = [];
				var sgf = player.getScenegraphFactory();
				for(var i=0; i<32; i++) {
					var line = sgf.createMovieClipInstance("Block");
					player.getStage().addChild(line);
					line.setVisible(false);
					this.lines.push(line);
					
					var line2 = sgf.createMovieClipInstance("Black");
					player.getStage().addChild(line2);
					line.setVisible(false);
					this.lines2.push(line2);
				}
				var linesIndex = 0;
				var linesIndex2 = 0;
				
				this.drawLine = function(line, start, end) {
					var deltaX = end.point[0] - start.point[0];
					var deltaY = end.point[1] - start.point[1];
					var angleInDegrees = Math.atan2(deltaY, deltaX);
					var distance = Math.sqrt( Math.pow(deltaX, 2) + Math.pow(deltaY, 2) );
			
					var m1 = new flwebgl.geom.Matrix();
					m1.scale(distance / 11.25, 1);
					m1.rotate(angleInDegrees);
					m1.translate(start.point[0], start.point[1]);
					
					line.setLocalTransform(m1);
				}
				
				this.dijkstra = function(start, target) {
					var that = this;
					simulator.onmessage = function(event){
						if(!event.data)
							return;
						var type = event.data.type;
						if(type == "finalist") {
							buffer = that.lines;
							currentIndex = linesIndex;
							scale = 10.95;
						} 
						else {
							buffer = that.lines2;
							currentIndex = linesIndex2;
						}
						
						document.querySelector('#messageBox').value = "Route score: " + event.data.score;
						
						var linesToDraw = event.data.lines;
						
						if(!event.data)
							return;
						
						var depth = 0;
						for(var i = 0; i < linesToDraw.length; i++) {
							var linePoints = linesToDraw[i];
							
							var line = buffer[depth];
							line.setVisible(true);
							
							that.drawLine( line, network[linePoints.from], network[linePoints.to] );
							depth++;
						}
						for(var lineToHide = depth; lineToHide < currentIndex; lineToHide++) {
							buffer[lineToHide].setVisible(false);
						}
						
						if(type == "finalist") {
							linesIndex = depth - 1;
						} 
						else {
							linesIndex2 = depth - 1;
						}
					};
					
					var bunnyInfo = {};
					for (var id in this.bunnies) {
						var bunny = this.bunnies[id];
						var node = bunny._node;
						bunnyInfo[id] = {
							node: node,
							target: bunny._work,
							stop: null,
							benefit: 0,
							costToStop: 0
						};
					}
					
					// State: bunnyId -> bunnyData
					var state = {};
					
					var timeWorth = document.getElementById('timeWorth').value;
					var gasPerKm = document.getElementById('gasPerKm').value;
					var busSpeed = document.getElementById('busSpeed').value;
			
					return simulator.postMessage( { func: 'dijkstra', arguments: [ start, target, bunnyInfo, timeWorth, gasPerKm, busSpeed ] } );
				}
				
				this.simulate = function () {
			
					var bus = this.bus;
					var transporterBunnies = this.transporterBunnies();
					var that = this;
					
					var choose = function (from, to, state) {
						var details = {};
						details.method = WALK;
						details.cost = from.joins[to.hash] * bunny._cost;
			
						for(driverId in transporterBunnies) {
							var driverBunny = transporterBunnies[driverId];
							var prevCost = 0;
							if(driverBunny._work) {
								prevCost = that.pathfinder(state[driverBunny._id].node, driverBunny._work).totalG;
							}
							
							var costToAPoint = that.pathfinder(state[driverBunny._id].node, from).totalG;
							var costToBPoint = that.pathfinder(from, to).totalG;
							var costToWorkFromBPoint = that.pathfinder(to, driverBunny._work).totalG;
							var totalCost = costToAPoint + costToBPoint + costToWorkFromBPoint;
							
							var difference = (totalCost - prevCost) * driverBunny._cost;
							
							if(difference < details.cost) {
								details.cost = difference;
								
								details.method = DRIVE;
								details.driver = driverBunny;
								state[driverBunny._id].node = to;
								details.extraBunnies = [ driverBunny ];
							}
						}
						
						// Now we know which transport is best for this leg of the trip!
						// How to: update state about location of both transports?
						// "Move A->B, move B->C  
						// !!! Should also consider walking
						return details;
					};
					
					var res = {};
					for(i in this.bunnies) {
						bunny = this.bunnies[i];
						res[i] = this.pathfinder(bunny._node, bunny._work, choose);
					}
					
					var that = this;
					for(i in res) {
						function traverse(bunnyId) {
							var currentBunny = that.bunnies[bunnyId];
							var path = res[bunnyId].path;
							var repeat = function () {
								var next = path.shift();
							
								if (next) {
									var method = next.method;
									
									
									if(method.driver) {
										var driver = method.driver;
										that.hideBunny(currentBunny);
										
										var node = network[next.target];
										currentBunny._node = node;
										currentBunny._transform.x = node.point[0];	
										currentBunny._transform.y = node.point[1];
										applyTransform(currentBunny);
										
										var done = function () {
											that.showBunny(currentBunny);
											repeat();
										}
										that.moveToNode(driver, node, done);
									}
									else {
										that.moveToNode(currentBunny, network[next.target], repeat);
									}
								}
							};
			
							repeat();
						}
						
						traverse(i);
					}
				}
			
				this.moveToNode = function (bunny, target, _callback) {
					if(bunny._node.hash == target.hash) {
						if(_callback)
							return _callback();
						return;
					}
					var distance = bunny._node.joins[target.hash];
					if (!distance) {
						var that = this;
						return this.pathfinder(bunny._node, target, function(res) {
							var path = res.path;
							var repeat = function () {
								var next = path.shift();
								if (next && next.target)
									that.moveToNode(bunny, network[next.target], repeat);
							};
			
							return repeat();
						});
					}
					var thatCallback = _callback;
					if(target.point[0] < bunny._node.point[0])
						bunny._transform.s = -Math.abs(bunny._transform.s);
					else
						bunny._transform.s = Math.abs(bunny._transform.s);
					TweenMax.to(bunny._transform, (distance / 300) * (ANIM_SPEED / bunny._speed), { ease: Linear.easeNone,
						x: target.point[0],
						y: target.point[1],
						onUpdate: function () {
							applyTransform(bunny);
						},
						onComplete: function () {
							bunny.getChildByName("bunny").gotoAndPlay("idle");
							bunny._cameFrom = bunny._node;
							bunny._node = target;
							if (thatCallback) thatCallback();
						}
					});
					//TweenMax.to(bunny._transform, 5, {x: 0, y: 0, onUpdate:applyProps});
			
					bunny.getChildByName("bunny").gotoAndPlay("walk");
				}
			
				function _hash(res) {
					return Math.round(res[0] / 26) * 26 + "," + Math.round(res[1] / 26) * 26;
					//return Math.round(res[0] / 26)*26 + "," + Math.round(res[1] / 26)*26;
				}
			
				this.init = function () {
			
					var r = this.getChildByName("routes");
					var tmp = {};
					var points = [];
					var routeSegments = r.getChildren();
			
					for (var i = 0; i < routeSegments.length; i++) {
						var rS = routeSegments[i];
						var b = rS.getBounds(this, false);
			
						function check(res) {
							var hash = _hash(res);
							if ((tmp[hash] = ++tmp[hash] || 1) == 2) {
								points.push(res);
							}
						}
			
						check([b.left, b.top]);
						check([b.left + b.width, b.top]);
						check([b.left, b.top + b.height]);
						check([b.left + b.width, b.top + b.height]);
					}
			
			
					/*
						network[hash] =
						point: [x, y]
						joins: [hash1, hash2, ... hashn]
						*/
			
					network = {};
			
					for (var i = 0; i < routeSegments.length; i++) {
						var rS = routeSegments[i];
						var b = rS.getBounds(this, false);
			
						function pivot(res) {
							var hash = _hash(res);
							if (tmp[hash] > 1) {
								return true;
							}
						}
			
						var tleft = [b.left, b.top];
						var tright = [b.left + b.width, b.top];
						var bleft = [b.left, b.top + b.height];
						var bright = [b.left + b.width, b.top + b.height];
			
						var n1, n2;
			
						if (pivot(tleft)) {
							n1 = tleft;
							n2 = bright;
						} else if (pivot(tright)) {
							n1 = tright;
							n2 = bleft;
						} else if (pivot(bleft)) {
							n1 = bleft;
							n2 = tright;
						} else if (pivot(bright)) {
							n1 = bright;
							n2 = tleft;
						}
			
						var hash1 = _hash(n1);
						var node1 = network[hash1];
						if (!node1) {
							node1 = network[hash1] = {
								point: n1,
								joins: {},
								pivot: true,
								hash: hash1
							}
						}
			
						var hash2 = _hash(n2);
						var node2 = network[hash2];
						if (!node2) {
							node2 = network[hash2] = {
								point: n2,
								joins: {},
								pivot: false,
								hash: hash2
							}
						}
			
						var distance = Math.sqrt(Math.pow(node1.point[0] - node2.point[0], 2) + Math.pow(node1.point[1] - node2.point[1], 2));
						node1["joins"][hash2] = distance;
						if (Object.keys(node1["joins"]).length > 1)
							node1["pivot"] = true;
						node2["joins"][hash1] = distance;
						if (Object.keys(node2["joins"]).length > 1)
							node2["pivot"] = true;
			
						network[hash1] = node1;
						network[hash2] = node2;
					}
			
					for (var hash in network) {
						var node = network[hash];
						if (node["pivot"] == true) {
							if (Object.keys(node["joins"]).length < 2) {
								//var b = this.spawnBunny(node, 0.15);
								console.log("Broken pivot " + hash);
							//	this.spawnDot(node, 1);
							}
							else {
								var b = this.spawnBunny(node, 0.05);
								b._work=network["286,130"];
							}
							//break;
						}
					}
					
					/*
					var a = this.spawnBunny(network["390,546"], 0.2);
					a._work = network["156,286"];
			
					var b = this.spawnBunny(network["494,494"], 0.2);
					b._work = network["416,182"];
					this.toggleCar(b);
					
					var c = this.spawnBunny(network["494,572"], 0.2);
					c._work = network["598,182"];
					
					*/
			
					this.network = network;
					resetSimulator();
					//this.spawnBunny(e.offsetX, e.offsetY, 0.1);
				}
				
				function resetSimulator() {
					if (typeof(simulator) != "undefined") {
						simulator.terminate();
					}
					
					simulator = new Worker("assets/dijkstra.js");
					simulator.postMessage({ network: this.network });
				}
			
				canvas.onclick = function (e) {
					/*
					if (isMouseOverSymbol(e.offsetX, e.offsetY, this.work.getBounds(this))) {
						this.mode = SET_WORK;
						for (var i in this.bunnies) {
							var bunny = this.bunnies[i];
							if (bunny._home) {
								this.moveToNode(bunny, bunny._work);
								bunny.getChildByName("bunny").gotoAndPlay("punch");
							}
						}
					} else if (isMouseOverSymbol(e.offsetX, e.offsetY, this.defend.getBounds(this))) {
						// Start your custom code
						// This example code shows an alert with words "Mouse clicked".
			
						this.mode = SET_HOME;
			
			
						for (var i in this.bunnies) {
							var bunny = this.bunnies[i];
							if (bunny._home) {
								this.moveToNode(bunny, bunny._home);
								bunny.getChildByName("bunny").gotoAndPlay("jump");
							}
						}
			
			
						// End your custom code                  
					} else if (isMouseOverSymbol(e.offsetX, e.offsetY, this.spawn.getBounds(this))) {
						// Start your custom code
						// This example code shows an alert with words "Mouse clicked".
			
						this.mode = MOVE;
			
						/*
						for(var i in this.bunnies)
						{
							var bunny = this.bunnies[i];
							var join;
							var options = [];
							for(join in bunny._node.joins)
							{
								if(bunny._cameFrom && bunny._cameFrom.hash == join) continue;
								options.push(join);
							}
							var choice = options[Math.floor(Math.random() * options.length)];
							if(!choice) choice = join;
							
							var target = this.network[choice];
							this.moveToNode(bunny, target);
						}
						*/
						/*
					} else if (isMouseOverSymbol(e.offsetX, e.offsetY, this.select.getBounds(this))) {
						this.mode = SPAWN;
					//}// else if (isMouseOverSymbol(e.offsetX, e.offsetY, this.attack.getBounds(this))) {
					//	this.mode = SELECT;
					} else {
						var hash = _hash([e.offsetX, e.offsetY]);
						var target = this.network[hash];
						if (!target) return;
			
						if (this.mode == MOVE) {
							var sBunnies = this.selectedBunnies();
							for (var id in sBunnies) {
								this.moveToNode(sBunnies[id], target);
							}
						} else if (this.mode == SELECT) {
							for (var i in this.bunnies) {
								var iBunny = this.bunnies[i];
								if (iBunny._node.hash == hash)
									this.selectBunny(iBunny);
							}
						} else if (this.mode == SET_HOME) {
							var sel = this.selectedBunnies();
							for (var i in sel) {
								sel[i]._home = target;
								sel[i].getChildByName("bunny").gotoAndPlay("jump");
							}
						} else if (this.mode == SET_WORK) {
							var sel = this.selectedBunnies();
							for (var i in sel) {
								sel[i]._work = target;
								sel[i].getChildByName("bunny").gotoAndPlay("punch");
							}
						} else if (this.mode == SPAWN) {
							this.spawnBunny(target, 0.2);
						}
					}
					*/
					
					for(var i=0; i<32; i++) {
						this.lines[i].setVisible(false);
						this.lines2[i].setVisible(false);
					}
					
					resetSimulator();
			
					var closestDistance;
					var closestId;
					for(var i in this.network) {
						var node = this.network[i];
						var deltaX = e.offsetX - node.point[0];
						var deltaY = e.offsetY - node.point[1];
						var distance = Math.sqrt( Math.pow(deltaX, 2) + Math.pow(deltaY, 2) );
						if(!closestDistance || distance < closestDistance) {
							closestId = i;
							closestDistance = distance;
						}
					}
					
					
					
					var start = network[closestId];
					var target = network["468,130"];
					
					this.dijkstra(start, target);
					
					for(var i in this.bunnies) {
						if(this.bunnies[i]._node.hash == closestId)
							this.selectBunny(this.bunnies[i]);
						else
							this.unSelectBunny(this.bunnies[i]);
					}
				}.bind(this);
			
				this.selectBunny = function (bunny) {
					var s = bunny.getChildren()[0];
					s.setVisible(!s.isVisible());
				}
				
				this.unSelectBunny = function (bunny) {
					var s = bunny.getChildren()[0];
					s.setVisible(false);
				}
			
				this.hideBunny = function (bunny) {
					var b = bunny.getChildren()[2];
					b.setVisible(false);
				}
			
				this.showBunny = function (bunny) {
					var b = bunny.getChildren()[2];
					b.setVisible(true);
				}
			
				this.toggleCar = function (bunny) {
					var s = bunny.getChildren()[1];
					var v = s.isVisible();
					if(!v) {
						s.setVisible(true);
						this.hideBunny(bunny);
						
						bunny._speed = 5;
						bunny._cost = 0.75;
						bunny._seats = 4;
					} else {
						s.setVisible(false);
						this.showBunny(bunny);
						
						bunny._speed = 1;
						bunny._cost = 1.4;
						bunny._seats = 1;
					}
				}
			
				this.transporterBunnies = function() {
					var selected = [];
					for (var i in this.bunnies) {
						var bunny = this.bunnies[i];
						var s = bunny.getChildren()[1];
						if (s.isVisible()) {
							selected.push(bunny);
						}
					}
					return selected;
				}
			
				this.firstSelected = function() {
					for (var i in this.bunnies) {
						var bunny = this.bunnies[i];
						var s = bunny.getChildren()[0];
						if (s.isVisible()) {
							return bunny;
						}
					}
				}
			
				this.selectedBunnies = function () {
					var selected = {};
					for (var i in this.bunnies) {
						var bunny = this.bunnies[i];
						var s = bunny.getChildren()[0];
						if (s.isVisible()) {
							selected[i] = bunny;
						}
					}
					return selected;
				}
			
				var bunnyIdCounter = 0;
				this.dots = [];
				
				this.spawnDot = function (node, s) {
					var sgf = player.getScenegraphFactory();
					var dot = sgf.createMovieClipInstance("dot");
			
					player.getStage().addChild(dot);
			
					dot._transform = {
						x: node.point[0],
						y: node.point[1],
						s: s
					};
					applyTransform(dot);
					
					dot._node = node;
					
			
					this.dots.push(dot);
					
					return dot;
				}
				
					this.spawnBunny = function (node, s) {
					var sgf = player.getScenegraphFactory();
					var bunny = sgf.createMovieClipInstance("BunnyCorrected");
					var id = bunnyIdCounter++;
					bunny._id = id;
			
					player.getStage().addChild(bunny);
			
					bunny._transform = {
						x: node.point[0],
						y: node.point[1],
						s: s
					};
					applyTransform(bunny);
					
					bunny._node = node;
					bunny._speed = 1;
					bunny._cost = 1.4;
					
			
					this.bunnies[id] = bunny;
					
					return bunny;
				}
			
				//Function to check whether the specified point lies within the rect.
				function isMouseOverSymbol(pointX, pointY, rect) {
					if (rect.left <= pointX && pointX <= rect.left + rect.width)
						if (rect.top <= pointY && pointY <= rect.top + rect.height)
							return true;
			
					return false;
				}
			
				canvas.onmousedown = function (e) {
					var boundingRect = this.defend.getBounds(this);
					if (isMouseOverSymbol(e.offsetX, e.offsetY, boundingRect)) {
						this.defend.gotoAndStop(2);
					}
			
					//var boundingRect = this.attack.getBounds(this);
					if (isMouseOverSymbol(e.offsetX, e.offsetY, boundingRect)) {
						this.attack.gotoAndStop(2);
					}
				}.bind(this);
			
				canvas.onmouseup = function (e) {
					var boundingRect = this.defend.getBounds(this);
					if (isMouseOverSymbol(e.offsetX, e.offsetY, boundingRect)) {
						this.defend.gotoAndStop(1);
					}
			
					//var boundingRect = this.attack.getBounds(this);
					if (isMouseOverSymbol(e.offsetX, e.offsetY, boundingRect)) {
						this.attack.gotoAndStop(1);
					}
				}.bind(this);
			
				var that = this;
			
				document.getElementById('toggleCar').onclick = function () {
					var sel = that.selectedBunnies();
					for (var id in sel) {
						that.toggleCar(sel[id]);
					}
				}
				
				document.getElementById('moveMode').onclick = function () {
					that.mode = MOVE;
				}
			
				document.getElementById('simulate').onclick = function () {
					that.simulate();
				}
			
				this.init();
		}
		actions.mc_Bunny_1_0 = function() {
			this.gotoAndPlay("idle");
		}
		actions.mc_Bunny_1_62 = function() {
			this.gotoAndPlay("idle");
		}
		actions.mc_Bunny_1_100 = function() {
			this.gotoAndPlay("idle");
		}
		actions.mc_Bunny_1_135 = function() {
			this.gotoAndPlay("idle");
		}
		actions.mc_Bunny_1_167 = function() {
			this.gotoAndPlay("walk");
		}
		actions.mc_Button32Attack_0_0 = function() {
			this.stop();
		}
		actions.mc_Button32Defend_0_0 = function() {
			this.stop();
		}
		actions.mc_Button32Spawn_0_0 = function() {
			this.stop();
		}
		actions.mc_Button32Work_0_0 = function() {
			this.stop();
		}
	})(flwebgl.actions || (flwebgl.actions = {}));
})(flwebgl || (flwebgl = {}));
