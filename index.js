var child_process = require('child_process');
var flow = require('flow-bin');
var merge = require('lodash.merge');

var store = {
  error: null,
  flowOptions: [
    'status',
    '--color=always',
    '--quiet',
  ],
  options: {
    warn: false,
    stopStartedServer: true,

    formatter: function (errorCode, errorDetails) {
      return 'Flow: ' + errorCode + '\n\n' + errorDetails;
    },
  },
};


function flowErrorCode(status) {
  var error;
  switch (status) {
    /*
    case 0:
      error = null;
      break;
    */
    case 1:
      error = 'Server Initializing';
      break;
    case 2:
      error = 'Type Error';
      break;
    case 3:
      error = 'Out of Time';
      break;
    case 4:
      error = 'Kill Error';
      break;
    case 6:
      error = 'No Server Running';
      break;
    case 7:
      error = 'Out of Retries';
      break;
    case 8:
      error = 'Invalid Flowconfig';
      break;
    case 9:
      error = 'Build Id Mismatch';
      break;
    case 10:
      error = 'Input Error';
      break;
    case 11:
      error = 'Lock Stolen';
      break;
    case 12:
      error = 'Could Not Find Flowconfig';
      break;
    case 13:
      error = 'Server Out of Date';
      break;
    case 14:
      error = 'Server Client Directory Mismatch';
      break;
    case 15:
      error = 'Out of Shared Memory';
      break;
  }

  return error;
}


function isFlowServerRunning() {
  var serverCheckOptions = [
    'status',
    '--no-auto-start',
  ];
  var res = child_process.spawnSync(flow, serverCheckOptions);
  return res.status !== 6;
}


function stopFlowServer() {
  var serverStopOptions = [
    'stop',
  ];
  child_process.spawn(flow, serverStopOptions);
}


function runFlow() {
  var stopWhenDone = store.options.stopStartedServer && !isFlowServerRunning();

  var res = child_process.spawnSync(flow, store.flowOptions);

  if (stopWhenDone) {
    stopFlowServer();
  }

  return res;
}


function storeError(res) {
  if (res.status !== 0) {
    var errorCode = flowErrorCode(res.status);
    var errorDetails = res.stdout.toString() + res.stderr.toString();

    store.error = new Error(store.options.formatter(errorCode, errorDetails));
  }
}


function checkFlowStatus(compiler, next) {
  var res = runFlow();
  storeError(res);
  next();
}


function pushError(compilation) {
  if (store.error) {
    if (store.options.warn) {
      compilation.warnings.push(store.error);
    } else {
      compilation.errors.push(store.error);
    }

    store.error = null;
  }
}


function FlowFlowPlugin(options) {
  store.options = merge(store.options, options);
}

FlowFlowPlugin.prototype.apply = function(compiler) {
  compiler.plugin('run', checkFlowStatus);
  compiler.plugin('watch-run', checkFlowStatus);

  compiler.plugin('compilation', pushError);
};

module.exports = FlowFlowPlugin;
