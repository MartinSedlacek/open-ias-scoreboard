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
 * @file Run control board
 * @license AGPL-3.0
 * @author Gary Kim
 */

const electron = require('electron');
const ipc = electron.ipcRenderer;

const gir = require('get-in-range');

let data = [{
    clock: {
        state: false,
        countdown: true,
        last: new Date(),
        current: 0,
        display: HTMLDivElement,
        displaystate: HTMLDivElement
    },
    penaltyh1: {
        state: false,
        countdown: true,
        last: new Date(),
        current: 0,
        display: HTMLDivElement,
        displaystate: HTMLDivElement
    },
    penaltyh2: {
        state: false,
        countdown: true,
        last: new Date(),
        current: 0,
        display: HTMLDivElement,
        displaystate: HTMLDivElement
    },
    penaltyg1: {
        state: false,
        countdown: true,
        last: new Date(),
        current: 0,
        display: HTMLDivElement,
        displaystate: HTMLDivElement
    },
    penaltyg2: {
        state: false,
        countdown: true,
        last: new Date(),
        current: 0,
        display: HTMLDivElement,
        displaystate: HTMLDivElement
    },
    home: {
        current: 0,
        scoreDisplay: HTMLDivElement,
        logo: HTMLImageElement
    },
    guest: {
        current: 0,
        scoreDisplay: HTMLDivElement,
        logo: HTMLImageElement
    },
    tab: HTMLButtonElement
}];

let current = 0;

window.onload = main;

function main() {
    setInterval(cron, 500);


    // Attach global event listeners
    document.querySelector('#new-tab-button').addEventListener('click', () => {
        ipc.send('create-scoreboard');
    });
    document.querySelector('#about-program').addEventListener('click', () => {
        ipc.send('open-about-program');
    });
}


/**
 * Creates a new scoreboard and assigns the related information and nodes to the data object.
 *
 * @param {number} name The index number of the new scoreboard.
 */
function createnewscoreboard(name) {
    data[name] = JSON.parse(JSON.stringify(data[0]));
    let newscoreboard = newscoreboardtab(name);
    let newtab = document.querySelector('.tabs').appendChild(newscoreboard.tab);
    document.querySelector('.content').appendChild(newscoreboard.controls);
    data[name].tab = newtab;
    setscoreboardtab(name);
}

/**
 * Create new scoreboard control nodes and attach required nodes to data object.
 *
 * @param {number} name The position in the data array of this new scoreboard.
 * @returns {Object} An object with {tab: Node, controls: Node}.
 */
function newscoreboardtab(name) {
    let tr = {};
    let tmp;

    // Create new tab
    tr.tab = document.createElement('button');
    tr.tab.setAttribute('scoreboard-id', name.toString());
    tr.tab.classList.add("tab-button");
    tr.tab.innerText = `Scoreboard #${name.toString()}`;
    tr.tab.addEventListener('click', (e) => { setscoreboardtab(e.currentTarget.getAttribute('scoreboard-id')); });

    // Create new scoreboard controls for the new tab.
    tr.controls = document.querySelector('template#newcontrols').content.children[0].cloneNode(true);
    tr.controls.setAttribute('scoreboard-id', name.toString());

    // Scoreboard overall controls
    tr.controls.querySelector('#visibility').addEventListener('click', (e) => {
        let action = (e.currentTarget.checked) ? 'show' : 'hide';
        ipc.send('window-op', { 'id': name, action: action });
    });
    tr.controls.querySelector('#close-tab').addEventListener('click', () => {
        ipc.send('window-op', { id: name, action: 'close' });
    });
    tr.controls.querySelector('#focus-window').addEventListener('click', () => {
        ipc.send('window-op', { id: name, action: 'focus' });
    });
    let rename_tab = tr.controls.querySelector('#rename-tab');
    rename_tab.value = `Scoreboard #${name}`;
    rename_tab.addEventListener('input', (e) => {
        let newtitle = e.currentTarget.value;
        data[name].tab.innerText = newtitle;
        ipcToScoreboard(name, 'title-set', newtitle);
    });
    

    // clock controls
    tr.controls.querySelector('#clock-toggle').addEventListener('click', () => {
        toggleClock(name);
    });
    data[name].clock.display = tr.controls.querySelector('#clock-current');
    data[name].clock.displaystate = tr.controls.querySelector('#clock-state');

    // Set the clock
    tr.controls.querySelector('#clock-set-submit').addEventListener('click', (e) => {
        e.preventDefault();
        let minutes = gir(tr.controls.querySelector('#clock-set-minutes').value, 0, 99);
        let seconds = gir(tr.controls.querySelector('#clock-set-seconds').value, 0, 59);
        clockset(name, ((minutes * 60) + seconds) * 1000);
    });
    // Set clock count down or count up.
    tr.controls.querySelector('#clock-direction').addEventListener('click', (e) => {
        data[name].clock.countdown = e.currentTarget.checked;
    });
    // Also allow easy incrementing of clock
    tr.controls.querySelector('#increase-clock').addEventListener('click', () => {
        clockset(name, gir(data[name].clock.current + 1000, 0, 5999000));
        penalty_inc(name);
    });



    tr.controls.querySelector('#decrease-clock').addEventListener('click', () => {
        clockset(name, gir(data[name].clock.current - 1000, 0, 5999000));
        penalty_dec(name);
    });

    // Penalties 

    // Add event listeners for guest penalty controls
    tr.controls.querySelector('#penalty-set-submit-home').addEventListener('click', () => {
        setPenalty(name, data[name].penaltyh1, 'home');
    });
    
    // Add event listeners for guest penalty controls
    tr.controls.querySelector('#penalty-set-submit-guest').addEventListener('click', () => {
        setPenalty(name, data[name].penaltyg1, 'guest');
    });

    // Add event listeners for guest penalty controls
    tr.controls.querySelector('#penalty-set-submit-home2').addEventListener('click', () => {
        setPenalty2(name, data[name].penaltyh2, 'home');
    });

    // Add event listeners for guest penalty controls
    tr.controls.querySelector('#penalty-set-submit-guest2').addEventListener('click', () => {
        setPenalty2(name, data[name].penaltyg2, 'guest');
    });
    

    // Scoreboard scaling controls
    tr.controls.querySelector('#scoreboard-scaling').addEventListener('change', (e) => {
        ipcToScoreboard(name, 'scale', e.currentTarget.value);
    });

    // Set team logo controls
    data[name].home.logo = tr.controls.querySelector('.logo-select.home img');
    data[name].guest.logo = tr.controls.querySelector('.logo-select.guest img');

    tr.controls.querySelector('.logo-select.home button').addEventListener('click', () => {
        setteamlogo(true, name);
    });
    tmp = tr.controls.querySelector('.logo-select.home .img-container');
    tmp.ondragover = (e) => {
        e.preventDefault();
    };
    tmp.ondrop = (e) => {
        e.preventDefault();
        
        if (e.dataTransfer.files.length !== 1 || !/^image\/.+/.test(e.dataTransfer.files.item(0).type)) {
            // TODO: Tell user they have either given too many files or an incorrect file type.
            return;
        } 
        ipcToScoreboard(name, 'set-logo', {'home': true, 'image_path': e.dataTransfer.files.item(0).path});

        e.currentTarget.querySelector('img').src = e.dataTransfer.files.item(0).path;

    };
    tr.controls.querySelector('.logo-select.guest button').addEventListener('click', () => {
        setteamlogo(false, name);
    });
    tmp = tr.controls.querySelector('.logo-select.guest .img-container');
    tmp.ondragover = (e) => {
        e.preventDefault();
    };
    tmp.ondrop = (e) => {
        e.preventDefault();
        
        if (e.dataTransfer.files.length !== 1 || !/^image\/.+/.test(e.dataTransfer.files.item(0).type)) {
            // TODO: Tell user they have either given too many files or an incorrect file type.
            return;
        } 
        ipcToScoreboard(name, 'set-logo', {'home': false, 'image_path': e.dataTransfer.files.item(0).path});

        e.currentTarget.querySelector('img').src = e.dataTransfer.files.item(0).path;

    };


    // Set team name controls
    tr.controls.querySelector('#home-name').addEventListener('input', (e) => {
        changeName(name, true, e.currentTarget.value);
    });
    tr.controls.querySelector('#guest-name').addEventListener('input', (e) => {
        changeName(name, false, e.currentTarget.value);
    });


    // team score controls
    teamscorecontrols(data[name].home, tr.controls.querySelector('#home-controls'), true);
    teamscorecontrols(data[name].guest, tr.controls.querySelector('#guest-controls'), false);
    /**
     * 
     * @param {Object} setOn Data object for specific team.
     * @param {Node} attachTo Node with div of team controls.
     * @param {boolean} home Setting for home?
     * 
     */
    function teamscorecontrols(setOn, attachTo, home) {
        setOn.scoreDisplay = attachTo.querySelector('.team-score');
        attachTo.querySelector('.increase-score').addEventListener('click', () => { changeScore(name, home, 1); });
        attachTo.querySelector('.decrease-score').addEventListener('click', () => { changeScore(name, home, -1); });
    }

    return tr;
}

function setPenalty(name, data, team) {
    const minutesInput = document.querySelector(`#penalty-set-minutes-${team}`);
    const secondsInput = document.querySelector(`#penalty-set-seconds-${team}`);

    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;

    // Calculate penalty time in milliseconds
    const penaltyTime = (minutes * 60 + seconds);

    data.current = penaltyTime * 1000;
    // You can now send this penaltyTime to your main process via IPC
    // and handle it accordingly
    ipcToScoreboard(name, 'set-penalty-time', { team, time: penaltyTime });
}

function setPenalty2(name, data, team) {
    const minutesInput = document.querySelector(`#penalty-set-minutes-${team}2`);
    const secondsInput = document.querySelector(`#penalty-set-seconds-${team}2`);

    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;

    // Calculate penalty time in milliseconds
    const penaltyTime = (minutes * 60 + seconds);

    data.current = penaltyTime * 1000;
    // You can now send this penaltyTime to your main process via IPC
    // and handle it accordingly
    ipcToScoreboard(name, 'set-penalty-time2', { team, time: penaltyTime });
}

function penalty_dec(name)
{
    

    if (data[name].penaltyh1.current === 0) {
    }
    else{
    data[name].penaltyh1.current = gir(data[name].penaltyh1.current - 1000, 0, 5999000);
    team = 'home';
     totalSeconds = Math.floor(data[name].penaltyh1.current / 1000);
     minutes = Math.floor(totalSeconds / 60);
     seconds = totalSeconds % 60;
     minutesInput = document.querySelector(`#penalty-set-minutes-home`);
     secondsInput = document.querySelector(`#penalty-set-seconds-home`);
    minutesInput.value = minutes; // Set minutes value
    secondsInput.value = seconds; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time', { team, time:  data[name].penaltyh1.current/1000 });
    }

    if (data[name].penaltyg1.current === 0) {
    }
    else{
    data[name].penaltyg1.current = gir(data[name].penaltyg1.current - 1000, 0, 5999000);
    print(data[name].penaltyg1.current);
    team = 'guest';
     totalSeconds1 = Math.floor(data[name].penaltyg1.current / 1000);
     minutes1 = Math.floor(totalSeconds1 / 60);
     seconds1 = totalSeconds1 % 60;
     minutesInput1 = document.querySelector(`#penalty-set-minutes-guest`);
     secondsInput1 = document.querySelector(`#penalty-set-seconds-guest`);
    minutesInput1.value = minutes1; // Set minutes value
    secondsInput1.value = seconds1; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time', { team, time:  data[name].penaltyg1.current/1000 });
    }

    if (data[name].penaltyh2.current === 0) {
    }
    else{
    data[name].penaltyh2.current = gir(data[name].penaltyh2.current - 1000, 0, 5999000);
    team = 'home';
     totalSeconds2 = Math.floor(data[name].penaltyh2.current / 1000);
     minutes2 = Math.floor(totalSeconds2 / 60);
     seconds2 = totalSeconds2 % 60;
     minutesInput2 = document.querySelector(`#penalty-set-minutes-home2`);
     secondsInput2 = document.querySelector(`#penalty-set-seconds-home2`);
    minutesInput2.value = minutes2; // Set minutes value
    secondsInput2.value = seconds2; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time2', { team, time:  data[name].penaltyh2.current/1000 });
    }

    if (data[name].penaltyg2.current === 0) {
    }
    else{
    data[name].penaltyg2.current = gir(data[name].penaltyg2.current - 1000, 0, 5999000);
    team = 'guest';
     totalSeconds3 = Math.floor(data[name].penaltyg2.current / 1000);
     minutes3 = Math.floor(totalSeconds3 / 60);
     seconds3 = totalSeconds3 % 60;
     minutesInput3 = document.querySelector(`#penalty-set-minutes-guest2`);
     secondsInput3 = document.querySelector(`#penalty-set-seconds-guest2`);
    minutesInput3.value = minutes3; // Set minutes value
    secondsInput3.value = seconds3; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time2', { team, time:  data[name].penaltyg2.current/1000 });
    }
}

function penalty_inc(name)
{
    

    if (data[name].penaltyh1.current === 0) {
    }
    else{
    data[name].penaltyh1.current = gir(data[name].penaltyh1.current + 1000, 0, 5999000);
    team = 'home';
     totalSeconds = Math.floor(data[name].penaltyh1.current / 1000);
     minutes = Math.floor(totalSeconds / 60);
     seconds = totalSeconds % 60;
     minutesInput = document.querySelector(`#penalty-set-minutes-home`);
     secondsInput = document.querySelector(`#penalty-set-seconds-home`);
    minutesInput.value = minutes; // Set minutes value
    secondsInput.value = seconds; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time', { team, time:  data[name].penaltyh1.current/1000 });
    }

    if (data[name].penaltyg1.current === 0) {
    }
    else{
    data[name].penaltyg1.current = gir(data[name].penaltyg1.current + 1000, 0, 5999000);
    print(data[name].penaltyg1.current);
    team = 'guest';
     totalSeconds1 = Math.floor(data[name].penaltyg1.current / 1000);
     minutes1 = Math.floor(totalSeconds1 / 60);
     seconds1 = totalSeconds1 % 60;
     minutesInput1 = document.querySelector(`#penalty-set-minutes-guest`);
     secondsInput1 = document.querySelector(`#penalty-set-seconds-guest`);
    minutesInput1.value = minutes1; // Set minutes value
    secondsInput1.value = seconds1; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time', { team, time:  data[name].penaltyg1.current/1000 });
    }

    if (data[name].penaltyh2.current === 0) {
    }
    else{
    data[name].penaltyh2.current = gir(data[name].penaltyh2.current + 1000, 0, 5999000);
    team = 'home';
     totalSeconds2 = Math.floor(data[name].penaltyh2.current / 1000);
     minutes2 = Math.floor(totalSeconds2 / 60);
     seconds2 = totalSeconds2 % 60;
     minutesInput2 = document.querySelector(`#penalty-set-minutes-home2`);
     secondsInput2 = document.querySelector(`#penalty-set-seconds-home2`);
    minutesInput2.value = minutes2; // Set minutes value
    secondsInput2.value = seconds2; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time2', { team, time:  data[name].penaltyh2.current/1000 });
    }

    if (data[name].penaltyg2.current === 0) {
    }
    else{
    data[name].penaltyg2.current = gir(data[name].penaltyg2.current + 1000, 0, 5999000);
    team = 'guest';
     totalSeconds3 = Math.floor(data[name].penaltyg2.current / 1000);
     minutes3 = Math.floor(totalSeconds3 / 60);
     seconds3 = totalSeconds3 % 60;
     minutesInput3 = document.querySelector(`#penalty-set-minutes-guest2`);
     secondsInput3 = document.querySelector(`#penalty-set-seconds-guest2`);
    minutesInput3.value = minutes3; // Set minutes value
    secondsInput3.value = seconds3; // Set seconds value
    ipcToScoreboard(name, 'set-penalty-time2', { team, time:  data[name].penaltyg2.current/1000 });
    }
}

/**
 * Sets the clock time then updates the clock on the control board and scoreboard.
 *
 * @param {string|number} name  Scoreboard to set on.
 * @param {number} miliseconds  Time to set clock to in miliseconds.
 * @param {boolean} [delta]  Should change by miliseconds?
 */
function clockset(name, miliseconds, delta) {
    if (delta === true) {
        data[name].clock.current = gir(data[name].clock.current + miliseconds, 0, 5999000);
    } else {
        data[name].clock.current = miliseconds;
    }
    data[name].clock.display.innerText = `${Math.floor(data[name].clock.current / 1000 / 60).toString().padStart(2, '0')}:${Math.floor(data[name].clock.current / 1000 % 60).toString().padStart(2, '0')}`;
    ipcToScoreboard(name, 'update-clock', data[name].clock.current / 1000);


}

/**
 * Start or stop the clock of the specified scoreboard.
 * 
 * @param {string|number} name Scoreboard to toggle clock on.
 */
function toggleClock(name) {
    let clock = data[name].clock;
    clock.last = new Date();
    clock.state = !clock.state;
    clock.displaystate.innerText = clock.state ? 'Running' : 'Stopped';

    let penalty = data[name].penaltyh1;
    penalty.last = new Date();
    penalty.state = !penalty.state;

    penalty = data[name].penaltyh2;
    penalty.last = new Date();
    penalty.state = !penalty.state;

    penalty = data[name].penaltyg1;
    penalty.last = new Date();
    penalty.state = !penalty.state;

    penalty = data[name].penaltyg2;
    penalty.last = new Date();
    penalty.state = !penalty.state;
}

/**
 * Change score of team.
 *
 * @param {string|number} name  Scoreboard to set on.
 * @param {boolean} home  Set on home?
 * @param {number} changeBy  The value to change score by.
 */
function changeScore(name, home, changeBy) {
    let setOn = data[name][home ? 'home' : 'guest'];
    setOn.current = gir(setOn.current + changeBy, 0, 99);
    setOn.scoreDisplay.innerText = setOn.current.toString().padStart(2, '0');
    ipcToScoreboard(name, 'set-score', { score: setOn.current, home: home });
}

/**
 * Changes the name of a team.
 * 
 * @param {number} sbid The id of the scoreboard to set on.
 * @param {boolean} home Set on home?
 * @param {string} changeTo The text to change the name to.
 */
function changeName(sbid, home, changeTo) {
    ipcToScoreboard(sbid, 'set-name', { home: home, changeTo: changeTo });
}

/**
 * Set the control window to be controlling another scoreboard tab.
 *
 * @param {string|name} name  Scoreboard to change tab to.
 */
function setscoreboardtab(name) {
    current = name;
    document.querySelectorAll('.tabs > button').forEach((curr) => {
        if (curr.getAttribute('scoreboard-id').toString() === current.toString()) {
            curr.classList.add('active');
        } else {
            curr.classList.remove('active');
        }
    });
    document.querySelectorAll('.controls').forEach((ctrl) => {
        if (ctrl.getAttribute('scoreboard-id').toString() === current.toString()) {
            ctrl.classList.remove('hidden');
        } else {
            ctrl.classList.add('hidden');
        }
    });
}

/**
 * @returns {number[]} All scoreboard indexes.
 */
function scoreboardList() {
    let tr = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i]) {
            tr.push(i);
        }
    }
    return tr;
}

/**
 * 
 * Brings up dialog where team logo can be chosen.
 * 
 * @param {boolean} home  Set for home?
 * @param {number} sbid  Scoreboard id for team logo to be set for.
 * 
 */
function setteamlogo(home, sbid) {
    ipc.send('set-logo', { scoreboard: sbid, home: home });
}

/**
 * Send a message to a scoreboard.
 * 
 * @param {number} name Scoreboard id for the scoreboard to send to.
 * @param {string} channel Channel to be sent to scoreboard on. 
 * @param {*} msg Message to send to scoreboard.
 */
function ipcToScoreboard(name, channel, msg) {
    ipc.send('relay', name, channel, msg);
}
function updatePenaltyIPC(scoreboardIndex, team, penaltyTimeInSeconds) {
    ipc.send('set-penalty-time', { scoreboardIndex, team, time: penaltyTimeInSeconds });
}
/**
 * Function to run tasks that require constant repeating.
 */
function cron() {
    for (let i = 1; i < data.length; i++) {
        if (!data[i]) continue;
        let each = data[i];
        if (each.clock.state) {
            let current = new Date();
            let change = (each.clock.countdown)? (each.clock.last - current) : -(each.clock.last - current);
            each.clock.current = gir(each.clock.current + change, 0, 5999000);
            each.clock.last = current;
            ipcToScoreboard(i, 'update-clock', each.clock.current / 1000);
            data[i].clock.display.innerText = `${Math.floor(each.clock.current / 1000 / 60).toString().padStart(2, '0')}:${Math.floor(each.clock.current / 1000 % 60).toString().padStart(2, '0')}`;
        }

        if (each.penaltyh1.state) {
            let current = new Date();
            let change = (each.penaltyh1.countdown) ? (each.penaltyh1.last - current) : -(each.penaltyh1.last - current);
            each.penaltyh1.current = gir(each.penaltyh1.current + change, 0, 5999000);
            each.penaltyh1.last = current;
            team = 'home';

            const totalSeconds = Math.floor(each.penaltyh1.current / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const minutesInput = document.querySelector(`#penalty-set-minutes-home`);
            const secondsInput = document.querySelector(`#penalty-set-seconds-home`);
            minutesInput.value = minutes; // Set minutes value
            secondsInput.value = seconds; // Set seconds value

            ipcToScoreboard(i, 'set-penalty-time', { team, time:  each.penaltyh1.current/1000 });

        }

        if (each.penaltyg1.state) {
            let current = new Date();
            let change = (each.penaltyg1.countdown) ? (each.penaltyg1.last - current) : -(each.penaltyg1.last - current);
            each.penaltyg1.current = gir(each.penaltyg1.current + change, 0, 5999000);
            each.penaltyg1.last = current;
            team = 'guest';

            const totalSeconds = Math.floor(each.penaltyg1.current / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const minutesInput = document.querySelector(`#penalty-set-minutes-guest`);
            const secondsInput = document.querySelector(`#penalty-set-seconds-guest`);
            minutesInput.value = minutes; // Set minutes value
            secondsInput.value = seconds; // Set seconds value

            ipcToScoreboard(i, 'set-penalty-time', { team, time:  each.penaltyg1.current/1000 });
        }

        if (each.penaltyh2.state) {
            let current = new Date();
            let change = (each.penaltyh2.countdown) ? (each.penaltyh2.last - current) : -(each.penaltyh2.last - current);
            each.penaltyh2.current = gir(each.penaltyh2.current + change, 0, 5999000);
            each.penaltyh2.last = current;
            team = 'home';

            const totalSeconds = Math.floor(each.penaltyh2.current / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const minutesInput = document.querySelector(`#penalty-set-minutes-home2`);
            const secondsInput = document.querySelector(`#penalty-set-seconds-home2`);
            minutesInput.value = minutes; // Set minutes value
            secondsInput.value = seconds; // Set seconds value

            ipcToScoreboard(i, 'set-penalty-time2', { team, time:  each.penaltyh2.current/1000 });

        }

        if (each.penaltyg2.state) {
            let current = new Date();
            let change = (each.penaltyg2.countdown) ? (each.penaltyg2.last - current) : -(each.penaltyg2.last - current);
            each.penaltyg2.current = gir(each.penaltyg2.current + change, 0, 5999000);
            each.penaltyg2.last = current;
            team = 'guest';

            const totalSeconds = Math.floor(each.penaltyg2.current / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const minutesInput = document.querySelector(`#penalty-set-minutes-guest2`);
            const secondsInput = document.querySelector(`#penalty-set-seconds-guest2`);
            minutesInput.value = minutes; // Set minutes value
            secondsInput.value = seconds; // Set seconds value

            ipcToScoreboard(i, 'set-penalty-time2', { team, time:  each.penaltyg2.current/1000 });
        }

}
}


// All recieveable commands
ipc.on('destory-scoreboard', (e, msg) => {
    data[msg] = null;
    document.querySelector(`.tabs > button[scoreboard-id='${msg}']`).remove();
    document.querySelector(`.content > div[scoreboard-id='${msg}']`).remove();
    let scoreboards = scoreboardList();
    let i = scoreboards.indexOf(current);
    setscoreboardtab(scoreboards[(i + 1) % scoreboards.length]);
});
ipc.on('set-logo', (e, msg) => {
    data[msg.scoreboard][msg.home ? 'home' : 'guest'].logo.src = msg.image_path;
});
ipc.on('create-scoreboard', (e, msg) => {
    createnewscoreboard(msg);
});
ipc.on('keyboard-input', (e, msg) => {
    if(document.activeElement.matches('input[type=text]'))
        return;
    switch (msg.action) {
        case 'home':
            switch (msg.arg) {
                case 'increase':
                    changeScore(current, true, 1);
                    break;
                case 'decrease':
                    changeScore(current, true, -1);
                    break;
            }
            break;
        case 'guest':
            switch (msg.arg) {
                case 'increase':
                    changeScore(current, false, 1);
                    break;
                case 'decrease':
                    changeScore(current, false, -1);
                    break;
            }
            break;
        case 'clock':
            switch (msg.arg) {
                case 'toggle':
                    toggleClock(current);
                    break;
                case 'increase':
                    clockset(current, 1000, true);
                    penalty_inc(current);
                    break;
                case 'decrease':
                    clockset(current, -1000, true);
                    penalty_dec(current);
                    break;
            }
            break;
        case 'tabs': {
            let scoreboards = scoreboardList();
            let i = scoreboards.indexOf(current);
            switch (msg.arg) {
                case 'next':
                    setscoreboardtab(scoreboards[(i + 1) % scoreboards.length]);
                    break;
                case 'new':
                    ipc.send('create-scoreboard');
                    break;
                case 'previous': {
                    let setto = i - 1;
                    if (setto < 0) {
                        setto = scoreboards.length - 1;
                    }
                    setscoreboardtab(scoreboards[setto]);
                    break;
                }
                case 'close':
                    if (i !== -1) {
                        ipc.send('window-op', { id: current, action: 'close' });
                    }
                    break;
            }
            break;
        }
    }
});