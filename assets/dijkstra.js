var network;

onmessage = function(e) {
  if(e.data.func == 'pathfinder') {
  	var res = pathfinder.apply(null, e.data.arguments);
  	self.postMessage(res);
  }
  else if(e.data.func == 'dijkstra') {
  	var res = dijkstra.apply(null, e.data.arguments);
  	self.postMessage(res);
  }
  else {
  	network = e.data.network;
  	console.log('Init network');
  }
}

// km / h
var walkSpeed = 5;

function dijkstra(start, target, state, timeWorth, gasCost, busSpeed) {
	var bunnyWalkCost = function(from, to) {
			return from.joins[to.hash] / walkSpeed * timeWorth;
		};
	for (var id in state) {
		var bunny = state[id];
		var res = this.pathfinder(bunny.node, target, bunnyWalkCost);
		state[id].prevCost = res.totalG;
	}

	var permutations = [];
	permutations.push({
		parent: null,
		cost: 0,
		hash: start.hash,
		state: state,
		visited: {},
		joins: start.joins,
		timeUsed: 0
	});
	permutations[0].visited[start.hash] = true; // < ES6 compatible

	var finalists = [];
	var state;
	var mostBenefit = 0;

	// Go through all permutations.. ie. brute force our way :I
	for (var permutationIndex = 0; permutationIndex < permutations.length; permutationIndex++) {
		var currentPermutation = permutations[permutationIndex];

		if (target.hash == currentPermutation.hash) {
			// Reached target, congratulations!
			// Save finished path into finalists
			finalists.push(currentPermutation);

			var currentTime = currentPermutation.timeUsed;
			totalBenefit = 0; 
			for(var bunnyId in currentPermutation.state) {
				var thisBunnysData = currentPermutation.state[bunnyId];
				if(!thisBunnysData.stop)
					continue;
				var bunnyHopOnTime = permutations[thisBunnysData.permutationIndex].timeUsed;
				var bunnyTravelTime = currentTime - bunnyHopOnTime;

				var bunniesValue = bunnyData.prevCost - bunnyTravelTime * timeWorth;
				if(bunniesValue < 0) {
					thisBunnysData.stop = null;
				}
				else 
					totalBenefit += bunniesValue;
			};

			var lines = [];
			for(var pointer = currentPermutation; pointer.parent; pointer = pointer.parent) {
					lines.push({from: pointer.hash, to: pointer.parent.hash});
			}
			if(totalBenefit > mostBenefit) {
				mostBenefit = totalBenefit;
				
				self.postMessage({type:"finalist", lines:lines});
			}
			else {
				self.postMessage({type:"buffer", lines:lines});
			}

			continue;
		};

		for (var hash in currentPermutation.joins) {
			// Don't loop forever, please..
			if (currentPermutation.visited[hash]) continue;

			// Make a deep copy so we can modify it independently
			var newState = JSON.parse(JSON.stringify(currentPermutation.state));
			
			for(var bunnyId in newState) {
				// Cost of traveling to the current location, eg bus stop
				var costToStop = pathfinder(newState[bunnyId].node, network[hash], bunnyWalkCost).totalG;
				
				// How much better is the deal compared to walking whole way
				var bunnyData = newState[bunnyId];
				var benefit = bunnyData.prevCost - costToStop;
				if(benefit > bunnyData.benefit) {
					bunnyData.stop = hash;
					bunnyData.benefit = benefit;
					bunnyData.costToStop = costToStop;
					bunnyData.permutationIndex = permutationIndex;
				}
			}
			
			var newVisited = JSON.parse(JSON.stringify(currentPermutation.visited));
			newVisited[hash] = true;
			
			var distance = currentPermutation.joins[hash];
			var costIncrement = distance * gasCost;

			permutations.push({
				parent: currentPermutation,
				hash: hash,
				joins: network[hash].joins,
				state: newState,
				visited: newVisited,
				timeUsed: currentPermutation.timeUsed + distance / busSpeed,
				cost: currentPermutation.cost + costIncrement
			});
		}
	}
	
	/*
	var path = [];

	do {
		path.push({ target: hash, method: cl[hash].method });
		hash = cl[hash].parent.hash;
	} while(cl[hash].parent);
	

	path.reverse();
	return { totalG: cl[current.hash].g, path: path };
	*/
}

function pathfinder(start, target, cost) {
	if(start.hash == target.hash) {
		return { totalG: 0, path: []};
	}
	if (!cost) {
		cost = function (from, to) {
			return from.joins[to.hash];
		}
	}
	
	var current = start;
	var hash = current.hash;
		
	var ol = {};
	ol[hash] = {
		parent: null,
		g: 0,
		hash: hash
	};

	var cl = {}

	while (true) {
		if(!current) {
			return { totalG: 1000000, path: [] };
		}
		hash = current.hash;
		cl[hash] = ol[hash];
		delete ol[hash];
		if (target.hash == current.hash) break;

		var node;
		var join;
		for (join in current.joins) {
			if (cl[join]) continue;
			if (ol[join]) {
				// TODO check if path is better
				continue;
			}

			node = network[join];
			var cost_ = cost(current, node);
			var g = cost_ + cl[hash].g;
			var h = Math.abs(node.point[0] - target.point[0]) + Math.abs(node.point[1] - target.point[1]);
			var f = g + h;

			ol[join] = {
				parent: cl[hash],
				hash: join,
				f: f,
				g: g,
				h: h
			}
		}

		var lowest_f = null;
		var lowest_hash = null;
		for (ol_hash in ol) {
			var ol_node = ol[ol_hash];
			if (!lowest_f || ol_node.f < lowest_f) {
				lowest_f = ol_node.f;
				lowest_hash = ol_node.hash;
			}
		}

		current = network[lowest_hash];
	}
	//alert("win");
	var path = [];

	do {
		path.push({ target: hash, method: cl[hash].method });
		hash = cl[hash].parent.hash;
	} while(cl[hash].parent);

	path.reverse();
	return { totalG: cl[current.hash].g, path: path };
}