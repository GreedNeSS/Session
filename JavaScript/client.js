'use strict';

const Session = require('./session.js');

const UNIX_EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT';
const COOKIE_EXPIRE = 'Fri, 01 Jan 2100 00:00:00 GMT';
const COOKIE_DELETE = `=deleted, Expires=${UNIX_EPOCH}; Path=/; Domain=`;

const parseHost = host => {
	if (!host) return 'no-host-in-http-headers';
	const portOffset = host.indexOf(':');
	if (portOffset > -1) host = host.substr(0, portOffset);
	return host;
};

class Client {
	constructor(req, res) {
		this.req = req;
		this.res = res;
		this.host = parseHost(req.headers.host);
		this.token = undefined;
		this.session = null;
		this.cookie = {};
		this.preparedCookie = [];
		this.parseCookie();
	}

	static async getInstance(req, res) {
		const client = new Client(req, res);
		try {
			await Session.restore(client);
		} catch (error) {
			console.log(error);
		}
		return client;
	}

	parseCookie() {
		const { req } = this;
		const cookie = req.headers.cookie;
		if (!cookie) return;
		const items = cookie.split(';');
		for (const item of items) {
			const parts = item.split('=');
			const key = parts[0].trim();
			const val = parts[1] || '';
			this.cookie[key] = val.trim();
		}
	}

	setCookie(name, val, httpOnly = false) {
		const { host } = this;
		const expires = `expires=${COOKIE_EXPIRE}`;
		let cookie = `${name}=${val}; ${expires}; Path=/; Domain=${host}`;
		if (httpOnly) cookie += '; httpOnly';
		this.preparedCookie.push(cookie);
	}

	deleteCookie(name) {
		if (name === this.token) {
			this.preparedCookie.push('token' + COOKIE_DELETE + this.host);
		}
	}

	sendCookie() {
		const { res, preparedCookie } = this;
		if (preparedCookie.length && !res.headersSent) {
			console.dir({ preparedCookie });
			res.setHeader('Set-Cookie', preparedCookie);
		}
	}
}

module.exports = Client;
