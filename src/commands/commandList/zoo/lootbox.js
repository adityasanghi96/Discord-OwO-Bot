/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

const blank = '<:blank:427371936482328596>';
const _box = '<:box:427352600476647425>';
const boxShake = '<a:boxshake:427004983460888588>';
const boxOpen = '<a:boxopen:427019823747301377>';
const fboxShake = '<a:fboxshake:725570543834759230>';
const fboxOpen = '<a:fboxopen:725570544615030865>';
const lootboxUtil = require('./lootboxUtil.js');
const maxBoxes = 100;

module.exports = new CommandInterface({
	alias: ['lootbox', 'lb'],

	args: '{count}|fabled',

	desc: "Opens a lootbox! Check how many you have in 'owo inv'!\nYou can get some more by hunting for animals. You can get a maximum of 3 lootboxes per day.\nYou can use the items by using 'owo use {id}'",

	example: ['owo lb', 'owo lb 10', 'owo lb fabled'],

	related: ['owo inv', 'owo hunt'],

	permissions: ['sendMessages'],

	group: ['animals'],

	appCommands: [
		{
			'name': 'lootbox',
			'type': 1,
			'description': 'Open a lootbox',
			'options': [
				{
					'type': 3,
					'name': 'count',
					'description': 'Number of lootboxes: [number, "all", "fabled"]',
				},
			],
			'integration_types': [0, 1],
			'contexts': [0, 1, 2],
		},
	],

	cooldown: 5000,
	half: 100,
	six: 500,

	execute: async function () {
		if (this.args.length > 0 && this.global.isInt(this.args[0])) {
			await openMultiple(this, parseInt(this.args[0]));
		} else if (this.options.count && this.global.isInt(this.options.count)) {
			await openMultiple(this, parseInt(this.options.count));
		} else if (
			(this.args.length > 0 && this.args[0].toLowerCase() == 'all') ||
			(this.options.count && this.options.count.toLowerCase() == 'all')
		) {
			let sql = `SELECT boxcount FROM lootbox WHERE id = ${this.msg.author.id};`;
			let result = await this.query(sql);
			if (!result[0] || result[0].boxcount <= 0) {
				this.errorMsg(", you don't have any more lootboxes!");
				return;
			}
			let boxcount = result[0].boxcount;
			if (boxcount > maxBoxes) boxcount = maxBoxes;
			await openMultiple(this, boxcount);
		} else if (
			(this.args.length && ['f', 'fabled'].includes(this.args[0].toLowerCase())) ||
			(this.options.count && ['f', 'fabled'].includes(this.options.count.toLowerCase()))
		) {
			await openFabledBox(this);
		} else await openBox(this);
	},
});

async function openBox(p) {
	let sql = `UPDATE lootbox SET boxcount = boxcount - 1 WHERE id = ${p.msg.author.id} AND boxcount > 0;`;
	sql += `SELECT uid FROM user WHERE id = ${p.msg.author.id};`;
	let result = await p.query(sql);

	let uid;
	if (result[0].changedRows == 0) {
		p.errorMsg(", You don't have any lootboxes!", 3000);
		return;
	} else if (!result[1][0] || !result[1][0].uid) {
		sql = `INSERT IGNORE INTO user (id) VALUES (${p.msg.author.id});`;
		result = await p.query(sql);
		uid = result.insertId;
	} else {
		uid = result[1][0].uid;
	}

	if (!uid) {
		p.errorMsg(', It looks like something went wrong...', 3000);
		return;
	}

	let gem = lootboxUtil.getRandomGems(uid, 1);
	let firstGem = gem.gems[Object.keys(gem.gems)[0]].gem;
	let gemName = firstGem.rank + ' ' + firstGem.type + ' Gem';
	let text1 =
		blank + ' **| ' + p.getName() + '** opens a lootbox\n' + boxShake + ' **|** and finds a ...';
	let text2 =
		firstGem.emoji +
		' **| ' +
		p.getName() +
		'** opens a lootbox\n' +
		boxOpen +
		' **|** and finds a' +
		(gemName.charAt(0) == 'E' || gemName.charAt(0) == 'U' ? 'n' : '') +
		' **' +
		gemName +
		'**!';

	result = await p.query(gem.sql);

	let msg = await p.send(text1);
	setTimeout(function () {
		msg.edit(text2);
	}, 3000);
}

async function openMultiple(p, count) {
	if (count > maxBoxes) count = maxBoxes;
	if (count <= 0) {
		p.errorMsg(', you need to open at least one silly!', 3000);
		return;
	}

	let sql = `UPDATE IGNORE lootbox SET boxcount = boxcount - ${count} WHERE id = ${p.msg.author.id} AND boxcount >= ${count};`;
	sql += `SELECT uid FROM user WHERE id = ${p.msg.author.id};`;
	let result = await p.query(sql);

	let uid;
	if (result[0].changedRows == 0) {
		p.errorMsg(", You don't have any lootboxes!", 3000);
		return;
	} else if (!result[1][0] || !result[1][0].uid) {
		sql = `INSERT IGNORE INTO user (id) VALUES (${p.msg.author.id});`;
		result = await p.query(sql);
		uid = result.insertId;
	} else {
		uid = result[1][0].uid;
	}

	if (!uid) {
		p.errorMsg(', It looks like something went wrong...', 3000);
		return;
	}

	let gems = lootboxUtil.getRandomGems(uid, count);
	let gemText = '';
	for (let key in gems.gems) {
		let gem = gems.gems[key];
		gemText += gem.gem.emoji + p.global.toSmallNum(gem.count) + ' ';
	}
	let text1 =
		blank +
		' **| ' +
		p.getName() +
		'** opens ' +
		count +
		' lootboxes\n' +
		boxShake +
		' **|** and finds...';
	let text2 =
		blank +
		' **| ' +
		p.getName() +
		'** opens ' +
		count +
		' lootboxes\n' +
		boxOpen +
		' **|** and finds: ' +
		gemText;

	result = await p.query(gems.sql);

	let msg = await p.send(text1);
	setTimeout(function () {
		msg.edit(text2);
	}, 3000);
}

async function openFabledBox(p) {
	let sql = `UPDATE lootbox SET fbox = fbox - 1 WHERE id = ${p.msg.author.id} AND fbox > 0;`;
	sql += `SELECT uid FROM user WHERE id = ${p.msg.author.id};`;
	let result = await p.query(sql);

	let uid;
	if (result[0].changedRows == 0) {
		p.errorMsg(", You don't have any lootboxes!", 3000);
		return;
	} else if (!result[1][0] || !result[1][0].uid) {
		sql = `INSERT IGNORE INTO user (id) VALUES (${p.msg.author.id});`;
		result = await p.query(sql);
		uid = result.insertId;
	} else {
		uid = result[1][0].uid;
	}

	if (!uid) {
		p.errorMsg(', It looks like something went wrong...', 3000);
		return;
	}

	let gem = lootboxUtil.getRandomFabledGems(uid, 1);
	let firstGem = gem.gems[Object.keys(gem.gems)[0]].gem;
	let gemName = firstGem.rank + ' ' + firstGem.type + ' Gem';
	let text1 =
		blank +
		' **| ' +
		p.getName() +
		'** opens a Fabled lootbox\n' +
		fboxShake +
		' **|** and finds a ...';
	let text2 =
		firstGem.emoji +
		' **| ' +
		p.getName() +
		'** opens a Fabled lootbox\n' +
		fboxOpen +
		' **|** and finds a' +
		(gemName.charAt(0) == 'E' || gemName.charAt(0) == 'U' ? 'n' : '') +
		' **' +
		gemName +
		'**!';

	result = await p.query(gem.sql);

	let msg = await p.send(text1);
	setTimeout(function () {
		msg.edit(text2);
	}, 3000);
}
