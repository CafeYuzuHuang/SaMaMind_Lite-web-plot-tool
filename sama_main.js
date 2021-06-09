// Author: YuzuHuang
// Last updated: Jun. 09, 2021 (Ver. 0.0.01)

// *** global variables ***
var data_obj1 = {};
var data_obj2 = {};
var fname1 = '';
var fname2 = '';

// *** event listeners ***
window.addEventListener("load", function(){
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		console.log("All the file APIs are supported!");
		console.assert(document.getElementById("req_msg"), "Find no element with ID 'req_msg'");
		console.assert(document.getElementById("perf_plot"), "Find no element with ID 'perf_plot'");
		console.assert(document.getElementById("output"), "Find no element with ID 'output'");
		openFile1(); // open OHLC and volume rawdata (technical indicators currently not used)
		openFile2(); // open asset record
	} else {
		alert("Error: Some file APIs are not supported!");
		console.log("Error: Some file APIs are not supported!");
	}
});

// *** functions ***
function openFile1(event) {
	var reader1 = new FileReader();
	var file1 = event.target.files[0]; // File object
	var text1 = [];
	fname1 = file1['name'];
	reader1.onload = function(){
		// After finishing reader1.readAsText, the following statements are executed sequentially
		text1 = reader1.result;
		// console.log(reader1.result.substring(0, 127));
		data_obj1 = strToArray(text1);
		console.log("Load VOHLC and technical indicators rawdata successfully!");
		console.log("# of rows: " + data_obj1.n_r);
		console.log("# of columns: " + data_obj1.n_c);
		console.log("Header: " + data_obj1.header);
		console.log("First row: " + data_obj1.arr[0]);
		checkAllLoaded();
	};
	reader1.readAsText(file1);
}

function openFile2() {
	var reader2 = new FileReader();
	var file2 = event.target.files[0];
	var text2 = [];
	fname2 = file2['name'];
	reader2.onload = function(){
		text2 = reader2.result;
		data_obj2 = strToArray(text2);
		console.log("# of rows: " + data_obj2.n_r);
		console.log("# of columns: " + data_obj2.n_c);
		console.log("Header: " + data_obj2.header);
		console.log("First row: " + data_obj2.arr[0]);
		console.log("Load asset record successfully!");
		checkAllLoaded();
	};
	reader2.readAsText(file2);
}

function strToArray(rawdata){
	var strByLine = rawdata.split("\n");
	var n_r = strByLine.length - 1; // # of rows, substracted by 1 to remove one empty row
	var n_c = 0; // # of columns
	for(i=0; i<strByLine[0].split(",").length; i++) { n_c++;
	}
	var arr = new Array(n_r-1);
	var header = new Array(n_c);
	header = strByLine[0].split(","); // get header
	for(i=1; i<n_r; i++) {
		arr[i-1] = new Array(n_c)
		arr[i-1] = strByLine[i].split(","); // get data
	}
	var results = {'header': header, 'arr': arr, 'n_r': n_r, 'n_c': n_c};
	return results;
}

function checkAllLoaded() {
	console.log("File names: "); console.log(fname1); console.log(fname2);
	try {
		var l1 = data_obj1.arr.length; var l2 = data_obj2.arr.length;
		console.log("Check array lengths: "); console.log(l1); console.log(l2);
		if(l1 > 0 && l2 > 0) {
			var rmsg = document.getElementById("req_msg");
			var fstb = document.getElementById("perf_plot");
			rmsg.style.display = "none";
			fstb.style.display = "block";
			console.log("Both files loaded successfully!");
		}
	}
	catch { // If arr.length === undefined, TypeError is ocurred
		console.log("Not both files have been loaded yet.")
	}
}

function drawPlot() {
	var disp = document.getElementById("output");
	const len1 = data_obj1.arr.length;
	const len2 = data_obj2.arr.length;
	const os1 = len1 - len2 + 1;
	const os2 = 1; // dropout the first row
	console.log("OHLC data length: " + len1); 
	console.log("Asset data length: " + len2);
	console.log("Offset required for rawdata data: " + os1);
	console.log("Offset required for asset data: " + os2)
	
	// Use plotly to show the backtest results
	// data_obj1 -> candle stick & volume
	var d = new Array(len2); var v = new Array(len2);
	var o = new Array(len2); var h = new Array(len2); var l = new Array(len2); var c = new Array(len2);
	var counts1 = 0;
	for(i=os1; i<len1; i++){ 
		d[counts1] = data_obj1.arr[i][0];
		v[counts1] = data_obj1.arr[i][1];
		o[counts1] = data_obj1.arr[i][2];
		h[counts1] = data_obj1.arr[i][3];
		l[counts1] = data_obj1.arr[i][4];
		c[counts1] = data_obj1.arr[i][5];
		counts1 += 1;
	}
	console.log("Check first date: " + d[0]); console.log("Last date: " + d[counts1-1]); console.log("Counts: " + counts1);
	var trace1 = {
		x: d, 
		open: o, 
		high: h, 
		low: l, 
		close: c, 
		decreasing: {line: {color: 'green'}, opacity: 0.85}, 
		increasing: {line: {color: 'red'}, opacity: 0.85}, 
		line: {color: '#7f7f7f', opacity: 0.85}, 
		type: 'candlestick', 
		name: 'K線圖', 
		xaxis: 'x', 
		yaxis: 'y'}; // OHLC
	var trace2 = {
		x: d, 
		y: v, 
		type: 'bar', 
		name: '成交量', 
		xaxis: 'x', 
		yaxis: 'y2', 
		marker: {color: '#ff7f0e', 
			line: {color: 'rgb(217,109,13)',width: 0.5}, 
			opacity: 0.5}}; // Volume
	
	// data_obj2 -> return based on the game rule or not
	// for based on the game rule, return is calculated based on the asset vs. time
	// if not, the result is derived from the accumulated daily return when position is held
	const length2 = len2 - os2;
	var dates = new Array(length2);
	var mid_p = new Array(length2);
	var asset = new Array(length2);
	var position = new Array(length2);
	var eq_1 = new Array(length2); // equity based on the game rule when training & testing DRL model
	var eq_2 = new Array(length2); // equity based on the daily return (most commonly used for conventional backtests)
	var counts2 = 0;
	var eq_tmp = 0;
	var dl = []; var vl = [];
	var ds = []; var vs = [];
	var dtp = []; var vtp = [];
	var dsl = []; var vsl = [];
	for(i=os2; i<len2; i++){ 
		dates[counts2] = d[counts2];
		mid_p[counts2] = data_obj2.arr[i][1];
		asset[counts2] = data_obj2.arr[i][2];
		position[counts2] = data_obj2.arr[i][6];
		counts2 += 1;
	}
	console.log("Check first date: " + dates[0]); console.log("Last date: " + dates[counts2-1]); console.log("Counts: " + counts2);
	eq_1 = asset.map(x => x*mid_p[0]/asset[0]);
	for(i=0; i<counts2; i++) {
		if(i==0) {
			eq_2[i] = parseFloat(mid_p[i]);
			if(parseInt(position[i]) > 0) { // open long position
				dl.push(dates[i]);
				vl.push(parseFloat(mid_p[i])*1.2);
				eq_tmp = eq_2[i];
			} else if(parseInt(position[i]) < 0) { // open short position
				ds.push(dates[i]);
				vs.push(parseFloat(mid_p[i])*1.2);
				eq_tmp = eq_2[i];
			}
		} else { 
			eq_2[i] = parseFloat(eq_2[i-1]) + parseFloat(position[i-1])*(parseFloat(mid_p[i]) - parseFloat(mid_p[i-1]));
			if(parseInt(position[i]) > 0 && parseInt(position[i-1]) == 0) { // open long position
				dl.push(dates[i]);
				vl.push(parseFloat(mid_p[i])*1.2);
				eq_tmp = eq_2[i];
			} else if(parseInt(position[i]) < 0 && parseInt(position[i-1]) == 0) { // open short position
				ds.push(dates[i]);
				vs.push(parseFloat(mid_p[i])*1.2);
				eq_tmp = eq_2[i];
			}
			if(parseInt(position[i]) == 0 && parseInt(position[i-1]) != 0) { // close position
				if(parseFloat(eq_2[i]) >= parseFloat(eq_tmp)) { // take profit
					dtp.push(dates[i]);
					vtp.push(parseFloat(mid_p[i])*1.1);
				} else { // stop loss
					dsl.push(dates[i]);
					vsl.push(parseFloat(mid_p[i])*1.1);
				}
			}
		}
	}
	console.log("# of long points: " + dl.length);
	console.log("# of short points: " + ds.length);
	console.log("# of take-profit points: " + dtp.length);
	console.log("# of stop-loss points: " + dsl.length);

	var trace3 = {
		x: dates, 
		y: mid_p, 
		type: 'scatter', 
		mode: 'lines', 
		name: '交易均價', 
		xaxis: 'x', 
		yaxis: 'y', 
		line: {color: 'cyan', width: 1}}; // mid price for trade = (H + L + 2C)/4 + bid-ask spread
	var trace4 = {
		x: dates, 
		y: eq_1, 
		type: 'scatter', 
		mode: 'lines', 
		name: '權益(依據AI訓練規則)', 
		xaxis: 'x', 
		yaxis: 'y', 
		line: {color: 'blue', width: 2}}; // equity derived from the asset record
	var trace5 = {
		x: dates, 
		y: eq_2, 
		type: 'scatter', 
		mode: 'lines', 
		name: '權益(傳統回測)', 
		xaxis: 'x', 
		yaxis: 'y', 
		line: {color: 'black', width: 2}}; // equity for conventional backtests
	var trace6 = {
		x: dl, 
		y: vl, 
		type: 'scatter', 
		mode: 'markers', 
		name: '做多點位', 
		xaxis: 'x', 
		yaxis: 'y', 
		marker: {color: 'rgb(161, 33, 24)', size: 10, symbol: 'triangle-up', line: {width: 0.5}}};
	var trace7 = {
		x: ds, 
		y: vs, 
		type: 'scatter', 
		mode: 'markers', 
		name: '放空點位', 
		xaxis: 'x', 
		yaxis: 'y', 
		marker: {color: 'rgb(20, 135, 34)', size: 10, symbol: 'triangle-down', line: {width: 0.5}}};
	var trace8 = {
		x: dtp, 
		y: vtp, 
		type: 'scatter', 
		mode: 'markers', 
		name: '停利點', 
		xaxis: 'x', 
		yaxis: 'y', 
		marker: {color: 'rgb(232, 252, 101)', size: 10, symbol: 'circle', line: {width: 0.5}}};
	var trace9 = {
		x: dsl, 
		y: vsl, 
		type: 'scatter', 
		mode: 'markers', 
		name: '停損點', 
		xaxis: 'x', 
		yaxis: 'y', 
		marker: {color: 'rgb(129, 67, 161)', size: 10, symbol: 'x', line: {width: 0.5}}};

	var data = [trace1, trace2, trace3, trace4, trace5, trace6, trace7, trace8, trace9]; // data for plotting
	// var data = [trace1, trace2, trace3, trace5]; // data for plotting (light version)
	var ttl = "個股權益走勢圖，基期: " + d[0];  
	var layout = {
		dragmode: 'zoom', 
		width: 800, 
		height: 800, 
		title: ttl, 
		showlegend: true, 
		xaxis: {autorange: true, domain: [0, 1], title: '日期', type: 'date'}, 
		yaxis: {autorange: true, domain: [0.3, 1], title: '價格(NT$)', type: 'log'}, 
		// yaxis: {autorange: true, domain: [0.3, 1], title: '價格(NT$)'}, // use linear scale
		yaxis2: {autorange: true, domain: [0, 0.2], title: '成交股數'}}; // plot settings
	console.log("Attempt to show plot:");
	Plotly.purge(disp); // unmount the previous plot
	Plotly.plot(disp, data, layout);
	console.log("Plot done!");
}

// <End>
