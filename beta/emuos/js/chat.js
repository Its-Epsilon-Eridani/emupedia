// noinspection DuplicatedCode
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define(['jquery', 'network', 'fingerprint'], factory);
	}
} (function ($, network, Fingerprint) {
	var $body = $('body');

	var net = network.start({
		servers: ['https://ws.emupedia.net:4000'],
		server: 0,
		mode: 0,
		debug: false
	});

	var fingerprint = new Fingerprint().get();

	net.socket.on('connect', function() {
		$(function() {
			net.send_cmd('auth', {user: 'EMU-' + fingerprint, room: 'Emupedia'});
		})
	});

	net.colors = ['rgba(180, 173, 173, 0.973)', '#395fa4', '#159904', 'rgba(128, 128, 128, 0.35)'];

	net.socket.on('host.set_room_data', function (data) {
		net.send_cmd('set_room_data', data.data);
		if (net.config.debug) net.log(data);
	});

	net.socket.on('room.info', function (data) {
		var r_users = '';

		for (var n in data.users) {
			var color = (n !== data.me) ? net.colors[3] : net.colors[1];
			r_users += '<div id="room_user_' + n + '" style="color: ' + color + ';">' + n + '</div>';
		}
		net.client_room_users.html(r_users);
		net.text_input.attr('placeholder', 'You are Typing as "' + data.me + '" on "' + data.name + '"');
		net.client_room_users.html(r_users);
		net.client_room.html(data.name);
	});

	net.socket.on('room.user_join', function (data) {
		net.client_room_users.append('<div id="room_user_' + data.user + '" style="color: ' + net.colors[3] + ';">' + data.user + '</div>');
	});

	net.socket.on('room.user_leave', function (data) {
		$('#room_user_' + data.user).remove();
	});

	net.socket.on('server.help', function (data) {
		var msg = '';

		for (var n in data) {
			// noinspection JSUnfilteredForInLoop
			msg += "<a class='do_cmd' style='cursor:pointer;color:" + net.colors[2] + ";'>/" + data[n] + " </a> "
		}

		net.log(msg);

		$('.do_cmd').off('click').on('click', function() {
			net.text_input.val($(this).html());
			net.text_input.focus();
		});
	});

	net.socket.on('room.msg', function (data) {
		var msg = '<span style="color: ' + net.colors[3] + ';">[' + data.user + '] </span>' + data.msg;
		net.log(msg);
	});

	net.socket.on('server.msg', function (data) {
		net.log(data, 2);
	});

	net.socket.on('silent.msg', function (data) {
		net.log(data, 1);
	});

	net.socket.on('connect', function() {
		net.chat_id = '<span style="color: #2c487e;">[' + net.socket.id + '] </span>';
		net.log('[connected][' + net.server + '] [id][' + net.socket.id + ']', 0);
	});

	net.socket.on('disconnect', function() {
		net.log('[disconnected][' + net.server + ']', 0);
	});

	if (net.config.debug) {
		net.socket.on('room.data', function (data) {
			net.log(data);
		});

		net.socket.on('room.user_data', function (data) {
			net.log(data);
		});

		net.socket.on('room.user_join', function (data) {
			net.log(data);
		});

		net.socket.on('room.user_leave', function (data) {
			net.log(data);
		});
		net.socket.on('room.user_reconnect', function (data) {
			net.log(data);
		});

		net.socket.on('room.user_disconnect', function (data) {
			net.log(data);
		});
		net.socket.on('room.my_id', function (data) {
			net.log(data);
		});
		net.socket.on('room.info', function (data) {
			net.log(data);
		});
	}

	net.log = function (txt, color) {
		if (typeof color === 'undefined') {
			color = 0;
		}

		if (!net.output_div) {
			if (net.config.mode === 1) {
				console.log(txt);
			}

			return false;
		}

		var colors = net.colors;

		color = (typeof colors[color] !== 'undefined') ? 'style="color:' + colors[color] + '"' : '';

		if (typeof txt === 'object') {
			// noinspection HtmlDeprecatedTag
			txt = '<br><xmp>' + JSON.stringify(txt, null, 2) + '</xmp>';
		}

		var d = new Date();

		var time_stamp = [
			'<span style="color:' + colors[1] + ';">[',
			('0' + d.getHours()).slice(-2),
			':',
			('0' + d.getMinutes()).slice(-2),
			':',
			('0' + d.getSeconds()).slice(-2),
			']&nbsp;</span>'
		].join('');

		txt = time_stamp + txt;
		$(net.output_div).append('<div ' + color + '>' + txt + '</div>');
		net.output_div.scrollTop = net.output_div.scrollHeight;
	};

	net.show = function() {
		net.console.slideDown(300);
		net.text_input.focus();
	};

	net.hide = function() {
		net.console.slideUp(300);
	};

	net.toggle = function() {
		net.console.slideToggle(300);
		net.text_input.focus();
	};

	net.send_input = function() {
		var msg = net.text_input.val();

		if (msg.trim() === '') {
			return false;
		}

		if (msg.charAt(0) === '/') {
			var data = {
				cmd: '',
				data: ''
			};

			msg = msg.substr(1).split(' ');
			data.cmd = msg.shift();
			data.data = msg.join(' ');

			while (data.data.charAt(0) === ' ') {
				data.data = data.data.substr(1);
			}

			if ((data.data.charAt(0) === '[') || (data.data.charAt(0) === '{')) {
				try {
					eval('var json_data =' + data.data);
				} catch (e) {
					var json_data = data.data;
				}

				data.data = json_data;
			}

			net.send_cmd(data.cmd, data.data);
		} else {
			net.send_cmd('room_msg', msg);
		}

		net.text_input.val('');
	};

	var network_ui = '<div id="client_console" class="client_decoration">' +
						'<div id="client_output" class="client_decoration client_left"></div>' +
						'<div class="client_decoration client_right">' +
							'<div id="client_room" class="client_decoration"></div>' +
							'<div id="client_room_users" class="client_decoration"></div>' +
						'</div>' +
						'<div id="client_input" class="client_decoration">' +
							'<input type="text" id="client_command" />' +
							'<button id="client_command_send">Send</button>' +
						'</div>' +
					'</div>';

	$body.append(network_ui);
	$body.keydown(function (e) {
		// noinspection JSRedundantSwitchStatement
		switch (e.keyCode) {
			case 192:
				net.toggle();
				return false;
		}
	});

	net.console = $('#client_console');
	net.text_input = $('#client_command');
	net.text_input_button = $('#client_command_send');
	net.output_div = $('#client_output');
	net.client_room_users = $('#client_room_users');
	net.client_room = $('#client_room');

	net.text_input.off('keypress').on('keypress', function (e) {
		if (e.which === 13) {
			net.send_input();
		}
	});

	net.text_input_button.off('click').on('click', function() {
		net.send_input();
	});
}));