/*
    Open IAS Scoreboard is an Electron based scoreboard application for IASAS event livestreams.
    Copyright (C) 2019 Gary Kim <gary@garykim.dev>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, version 3.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
/**
 * @file Run scoreboard
 * @license AGPL-3.0
 * @author Gary Kim
 */

const electron = require('electron');
const ipc = electron.ipcRenderer;

window.onload = main;

/**
 * Converts a digit or symbol to a file path to an image representing that digit or symbol.
 *
 * @param {string|number} val  Digit or symbol to get file path for.
 * @returns {string} File path to image with requested digit or symbol.
 */
function digitLocation(val) {
    return `../res/clock/digits/${val}.svg`;
}

let clock = {
    digits: []
};

let penaltyTime = {
    home: {minutes: 0, seconds: 0},
    guest: {minutes: 0, seconds: 0},
    digits: {
        home: [],
        guest: []
    }
};

let scoreDisplays = {
    home: {
        digits: []
    },
    guest: {
        digits: []
    }
};


let teams = {
    logos: {
        home: HTMLImageElement,
        guest: HTMLImageElement
    },
    name: {
        home: HTMLSpanElement,
        guest: HTMLSpanElement
    }
};


function main() {
    // Setup
    // Set up clock and scoring
    clock.dom = document.querySelector('#main-clock');
    scoreDisplays.home.dom = document.querySelector('#home-score');
    scoreDisplays.guest.dom = document.querySelector('#guest-score');
    add2array(clock.dom.querySelectorAll('.digit'), clock.digits);
    add2array(scoreDisplays.home.dom.querySelectorAll('.digit'), scoreDisplays.home.digits);
    add2array(scoreDisplays.guest.dom.querySelectorAll('.digit'), scoreDisplays.guest.digits);

    penaltyTime.digits.home = document.querySelector('#home-penalties').querySelectorAll('.digit');
    penaltyTime.digits.guest = document.querySelector('#guest-penalties').querySelectorAll('.digit');
    

    /**
     * 
     * @param {any[]} data The object to which the extra elements should be added.
     * @param {any[]} arr An array of the elements to be added to data.
     */
    function add2array(data, arr) {
        data.forEach((tmp) => {
            arr.push(tmp);
        });
    }

    // Set up team logos
    teams.logos.home = document.querySelector('#home-logo img');
    teams.logos.guest = document.querySelector('#guest-logo img');

    // Set up team names
    teams.name.home = document.querySelector('#home-name');
    teams.name.guest = document.querySelector('#guest-name');

    document.querySelectorAll('img').forEach((each) => {
        each.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    });
}

/**
 * Changes the clock display.
 *
 * @param {number} seconds  Time to be shown on clock in seconds.
 */
function changeclock(seconds) {
    let secondDisplay = Math.floor(seconds % 60);
    let minuteDisplay = Math.floor((seconds / 60));

    changedigit(clock.digits[3], Math.floor(secondDisplay % 10));
    changedigit(clock.digits[2], Math.floor(secondDisplay / 10));
    changedigit(clock.digits[1], Math.floor(minuteDisplay % 10));
    changedigit(clock.digits[0], Math.floor(minuteDisplay / 10));
}

function changePenaltyTime(team, timeInSeconds) {
    // Convert the time to minutes and seconds
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;

    // Select the penalty time elements based on the team
    const penaltyTimeElement = document.querySelector(`#${team}-penalty-time`);
    const penaltyDigitsElements = document.querySelectorAll(`#${team}-penalties .digit`);


    // Update the penalty digits images
    const minuteTens = Math.floor(minutes / 10);
    const minuteOnes = Math.floor(minutes % 10);
    const secondTens = Math.floor(seconds / 10);
    const secondOnes = Math.floor(seconds % 10);

    // Update the digit images using a helper function (changedigit)
    changedigit(penaltyDigitsElements[0], minuteTens);
    changedigit(penaltyDigitsElements[1], minuteOnes);
    changedigit(penaltyDigitsElements[2], secondTens);
    changedigit(penaltyDigitsElements[3], secondOnes);
}


function changePenaltyTime2(team, timeInSeconds) {
    // Convert the time to minutes and seconds
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;

    // Select the penalty time elements based on the team

    const penaltyDigitsElements = document.querySelectorAll(`#${team}-penalties .digit2`);
    // Update the penalty digits images
    const minuteTens = Math.floor(minutes / 10);
    const minuteOnes = Math.floor(minutes % 10);
    const secondTens = Math.floor(seconds / 10);
    const secondOnes = Math.floor(seconds % 10);

    // Update the digit images using a helper function (changedigit)
    changedigit(penaltyDigitsElements[0], minuteTens);
    changedigit(penaltyDigitsElements[1], minuteOnes);
    changedigit(penaltyDigitsElements[2], secondTens);
    changedigit(penaltyDigitsElements[3], secondOnes);
}



/**
 * Changes score that is shown on the scoreboard.
 *
 * @param {number} score  Score to set.
 * @param {boolean} home  Setting home team's score?
 */
function changescore(score, home) {
    let display = home ? scoreDisplays.home : scoreDisplays.guest;

    changedigit(display.digits[0], Math.floor(score / 10));
    changedigit(display.digits[1], Math.floor(score % 10));
}

/**
 * Changes the image of the given Node to the one representing the number passed as val.
 *
 * @param {Node} digit  Node of image to change.
 * @param {number} val  Number to change digit to.
 */
function changedigit(digit, val) {
    digit.src = digitLocation(val);
}

// All recieveable commands
ipc.on('update-clock', (e, val) => {
    changeclock(val);
});
ipc.on('set-score', (e, msg) => {
    changescore(msg.score, msg.home);
});
ipc.on('title-set', (e, input) => {
    document.title = input || "Untitled Scoreboard";
});
ipc.on('set-logo', (e, msg) => {
    teams.logos[msg.home ? 'home' : 'guest'].src = msg.image_path;
});
ipc.on('set-name', (e, msg) => {
    teams.name[msg.home ? 'home' : 'guest'].innerText = msg.changeTo;
});
ipc.on('scale', (e, msg) => {
    document.body.style.zoom = msg;
});
ipc.on('set-penalty-time', (e, msg) => {
    // msg should contain {team: 'home' or 'guest', time: number in seconds}
    changePenaltyTime(msg.team, msg.time);
});

ipc.on('set-penalty-time2', (e, msg) => {
    // msg should contain {team: 'home' or 'guest', time: number in seconds}
    changePenaltyTime2(msg.team, msg.time);
});
