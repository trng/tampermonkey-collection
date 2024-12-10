// ==UserScript==
// @name         Futsal Lineup builder (json)
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Intercept a click and log the HTML code at the clicked location
// @author       You
// @match        https://futsal.com.ua/%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0/*
// @grant        none
// ==/UserScript==

function blinkText(text) {
  if (text.dataset.blinking === 'true') return; // Check if blinking is already active for this text node
  text.dataset.blinking = 'true'; // Mark the text node as blinking

  // Start the blinking effect
  const blinkInterval = setInterval(() => {
      text.style.color = text.style.color == 'red' ? 'white' : 'red';
  }, 100); // Blinking interval (ms)

  // Stop blinking after 2 seconds
  setTimeout(() => {
    clearInterval(blinkInterval); // Stops the interval
    text.style.color = 'white';
    text.dataset.blinking = 'false'; // Reset the blinking state
  }, 2000); // Duration for blinking (ms)
}

function exportJSON(home_guest) {
    let file_names = {
        'Home': 'Line_UP_Home.json',
        'Guest': 'Line_UP_Guest.json'
    }
    if (players_lists[1].playersListNode.children.length < players_lists[1].playersListMaxLength && !confirm(`Starter5 less than 5. Continue?`) )
        { return; }
    if (players_lists[0].playersListNode.children.length < players_lists[0].playersListMaxLength && !confirm(`Bench less than ${players_lists[0].playersListMaxLength}. Continue?`) )
        { return; }

    let starter5 = players_lists[1].getPlayersListObject();
    let bench_players = players_lists[0].getPlayersListObject();
    starter5["SubsPlayers.Text"] = bench_players; // "merge" starter5 and bench players lists
    let blob = new Blob([JSON.stringify([starter5], null, 2)], { type: "text/plain" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file_names[home_guest];
    link.click();
}

const html_string = `<div style="position: fixed; top: 0; right: 0; background-color: rgba(55, 55, 255, 0.75); color: white; padding: 5px; z-index: 10000; font-weight: bold; border: 1px solid  rgb(55, 55, 255);">
  <div>&nbsp;</div>
  <div><button id="exportHomeId" style="padding:0.2em;">Export Home</button>&nbsp;&nbsp;<button id="exportGuestId" style="padding:0.2em;">Export Guest</button></div>
  <p></p>
  <div>
    <div>Starter 5 (<span>0</span> selected)<br><sup style="color: lightgrey">(Ctrl-click on player row)</sup></div>
    <div id="starter5InjId" style="background-color: rgba(55, 55, 255, 0.5); padding: 5px; font-size: 0.7em; color: lightgreen; cursor: move;"></div>
  </div>
  <p></p>
  <div>
    <div>Bench players (<span>0</span> selected)<br><sup style="color: lightgrey">(Mouse click on player row)</sup></div>
    <div id="benchPlayersInjId" style="background-color: rgba(55, 55, 255, 0.5); padding: 5px; font-size: 0.7em; color: lightpink; cursor: move;"></div>
  </div>
</div>`;

// Parse the HTML string using DOMParser
const doc = new DOMParser().parseFromString(html_string, 'text/html');

// Get the div element from the parsed document and append the div to the body
const new_div = doc.body.firstElementChild;
document.body.appendChild(new_div);


const starter5_injected_node = new_div.querySelector('#starter5InjId');
const bench_players_injected_node = new_div.querySelector('#benchPlayersInjId');


class PlayersList {
    constructor(pln, plml, rbgc) {
        this.playersListNode = pln;
        this.playersListMaxLength = plml;
        this.rowBgColor = rbgc;
    }

    get actualListLength() { return this.playersListNode.querySelectorAll(':scope > div').length }

    playerDiv(player_num_with_name) {
        return Array.from(this.playersListNode.querySelectorAll(':scope > div')).find( element => element.innerHTML === player_num_with_name )
    }

    removePlayer(player_num_with_name) {
        const playerDiv = this.playerDiv(player_num_with_name);
        if (playerDiv) {
            // Remove the sub-array at the found index
            playerDiv.__data.style.removeProperty('background-color');
            playerDiv.remove();
        }
    }

    addPlayer(clicked_row) {
        const player_name = clicked_row.querySelector('.data-name').textContent.trim();
        const player_num = clicked_row.firstChild.textContent.trim();
        const player_num_with_name = player_num.padStart(2, ' ') + "    " + player_name;
        if ( typeof players_lists[0].playerDiv(player_num_with_name) != 'undefined') {
            players_lists[0].removePlayer(player_num_with_name)
        } else if (typeof players_lists[1].playerDiv(player_num_with_name) != 'undefined' ) {
            players_lists[1].removePlayer(player_num_with_name)
        } else {
            if ( this.actualListLength < this.playersListMaxLength ) {
                const newDivElement = document.createElement("div");
                newDivElement.draggable = true;
                newDivElement.__data = clicked_row;
                newDivElement.dataset.playerName = player_name;
                newDivElement.dataset.playerNum = player_num;
                newDivElement.innerHTML = player_num_with_name;
                this.playersListNode.appendChild(newDivElement);
                clicked_row.style.backgroundColor = this.rowBgColor;
            } else {
                blinkText(this.playersListNode.previousElementSibling)
            }
        }
    }

    getPlayersListObject() {
      const data = Array.from(this.playersListNode.children); // Get child divs
      let ret_val = {};
      if (this.playersListMaxLength == 5) { // starter5 or bench players?
        ret_val = data.reduce((obj, child, index) => {
            obj[`Name_${index + 1}.Text`] = child.dataset.playerName;
            obj[`Num_${index + 1}.Text`] = child.dataset.playerNum;
            return obj;
        }, {});
      } else {
        ret_val = data.map(element => element.textContent) // Extract and trim the text content of each element
            .join('\n'); // Join all text with a newline as the separator
      }
      console.log(ret_val);
      return ret_val;
    }
}

const players_lists = []; // 1 - true: starter5, 0 - false: benchPlayers
players_lists[1] = new PlayersList(starter5_injected_node, 5, 'lightgreen');
players_lists[0] = new PlayersList(bench_players_injected_node, 9, 'lightpink');


(function() {
    'use strict';
    new_div.querySelector('#exportHomeId').onclick = function() { exportJSON("Home") };
    new_div.querySelector('#exportGuestId').onclick = function() { exportJSON("Guest") };
    new_div.querySelector('div').innerHTML = document.title.replace('- Асоціація футзалу України', '');

    // main listener (click on document)
    document.addEventListener('click', function(event) {
        // Get the HTML element at the clicked position
        const clicked_row = event.target.closest('tr');
        if (clicked_row) {
            const nameElement = clicked_row.querySelector('.data-name');
            if (nameElement) {
                // click inside player row
                // new_div.querySelector('div').innerHTML = document.querySelector('table.sp-player-list tr td.data-team span.team-logo img').title;
                players_lists[Number(event.ctrlKey)].addPlayer(clicked_row);
            }
        } else {
            // click outside player row
            if (event.target.closest('#starter5InjId')) players_lists[1].removePlayer( event.target.innerHTML); // click inside starter5InjectedNode
            if (event.target.closest('#benchPlayersInjId')) players_lists[0].removePlayer(event.target.innerHTML); // click inside benchPlayersInjectedNode
        }
    });
})();



let draggedItem = null;

const observerCallbackPlayersListChanged = (mutationsList, observer) => {
  for (let mutation of mutationsList) {
    if (mutation.type === 'childList') {
      mutation.target.previousElementSibling.querySelector('span').innerHTML = mutation.target.querySelectorAll(':scope > div').length;
    } else if (mutation.type === 'attributes') {
      console.log('Child nodes attributes were added or removed');
    }
  }
}; // Create a MutationObserver callback function

const observerConfigForPlayersList = {
  childList: true,    // Detect changes to child nodes
  subtree: true,      // Detect changes in all descendant nodes
  attributes: true,   // Detect attribute changes (e.g., class, style)
  characterData: true // Detect changes to text content
}; // Set up the observer configuration

const observerForPlayersList = new MutationObserver(observerCallbackPlayersListChanged); // Create and start observing the parent node

players_lists.forEach((playersListObj) => {
    observerForPlayersList.observe(playersListObj.playersListNode, observerConfigForPlayersList);
    // To stop observing all nodes
    //observer.disconnect();
    // To stop observing a specific node (if needed in future)
    //observer.unobserve(parentNode1);

    playersListObj.playersListNode.addEventListener('dragstart', (event) => {
        draggedItem = event.target;
        draggedItem.dataset.dragStartParentId = draggedItem.parentNode.id;
        draggedItem.classList.add('dragging');
    });

    playersListObj.playersListNode.addEventListener('dragend', (event) => {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    });

   playersListObj.playersListNode.addEventListener('dragover', (event) => {
       event.preventDefault();
       const draggingOverItem = event.target.closest('div[draggable]');
       let max_list_length = playersListObj.playersListMaxLength;
       if (draggingOverItem) {
           if (draggedItem.dataset.dragStartParentId === draggingOverItem.parentNode.id) max_list_length++;
           if (playersListObj.actualListLength < max_list_length) {
               if (draggingOverItem !== draggedItem) {
                   const bounding = draggingOverItem.getBoundingClientRect();
                   const offset = event.clientY - bounding.top;
                   const midpoint = bounding.height / 2;
                   if (offset > midpoint) {
                       draggingOverItem.after(draggedItem);
                   } else {
                       draggingOverItem.before(draggedItem);
                   }
               }
           } else {
               blinkText(playersListObj.playersListNode.previousElementSibling);
           }
        }

    });

    playersListObj.playersListNode.addEventListener('drop', (event) => {
        event.preventDefault(); // Prevent default action
        if (playersListObj.playersListNode.querySelectorAll(':scope > div').length == 0) playersListObj.playersListNode.appendChild(draggedItem);
        draggedItem.__data.style.backgroundColor = playersListObj.rowBgColor;
    });
}); // define all event listeners
