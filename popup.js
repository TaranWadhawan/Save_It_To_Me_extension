document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('save-session-btn');
  const sessionsList = document.getElementById('sessions-list');

  // Load saved sessions on popup open
  loadSessions();

  // Save current window's tabs
  saveBtn.addEventListener('click', () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      // Filter out utility tabs with no valid web URLs if necessary
      const tabData = tabs.map(tab => ({
        title: tab.title || tab.url,
        url: tab.url
      }));

      if (tabData.length === 0) return;

      const newSession = {
        id: Date.now().toString(),
        name: getFormattedDateTime(),
        tabs: tabData
      };

      chrome.storage.local.get({ sessions: [] }, (data) => {
        const updatedSessions = [newSession, ...data.sessions];
        chrome.storage.local.set({ sessions: updatedSessions }, () => {
          loadSessions();
        });
      });
    });
  });

  // Get current date and time in YYYY-MM-DD HH:MM:SS format
  function getFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Load and render saved sessions from local storage
  function loadSessions() {
    chrome.storage.local.get({ sessions: [] }, (data) => {
      sessionsList.innerHTML = '';
      
      if (data.sessions.length === 0) {
        sessionsList.innerHTML = '<p style="font-size:12px; color: #777;">No saved sessions yet.</p>';
        return;
      }

      data.sessions.forEach((session) => {
        const sessionCard = createSessionElement(session);
        sessionsList.appendChild(sessionCard);
      });
    });
  }

  // Create UI element for a single session
  function createSessionElement(session) {
    const card = document.createElement('div');
    card.className = 'session-card';

    // Header section
    const header = document.createElement('div');
    header.className = 'session-header';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'session-title-input';
    titleInput.value = session.name;
    titleInput.addEventListener('change', (e) => {
      renameSession(session.id, e.target.value);
    });

    const actions = document.createElement('div');
    actions.className = 'session-actions';

    const openAllBtn = document.createElement('button');
    openAllBtn.innerText = 'Restore';
    openAllBtn.addEventListener('click', () => openSession(session.tabs));

    const bookmarkAllBtn = document.createElement('button');
    bookmarkAllBtn.innerText = 'Bookmark All';
    bookmarkAllBtn.addEventListener('click', () => bookmarkAll(session.name, session.tabs));

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = 'Delete';
    deleteBtn.style.color = 'red';
    deleteBtn.addEventListener('click', () => deleteSession(session.id));

    actions.appendChild(openAllBtn);
    actions.appendChild(bookmarkAllBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleInput);
    header.appendChild(actions);
    card.appendChild(header);

    // Tabs list section
    const tabList = document.createElement('ul');
    tabList.className = 'tab-list';

    session.tabs.forEach((tab, index) => {
      const tabItem = document.createElement('li');
      tabItem.className = 'tab-item';

      const link = document.createElement('a');
      link.className = 'tab-link';
      link.href = '#';
      link.title = tab.title;
      link.innerText = tab.title;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: tab.url });
      });

      const itemActions = document.createElement('div');
      itemActions.className = 'tab-item-actions';

      const bookmarkSingleBtn = document.createElement('button');
      bookmarkSingleBtn.innerText = '★';
      bookmarkSingleBtn.title = 'Bookmark page';
      bookmarkSingleBtn.addEventListener('click', () => {
        chrome.bookmarks.create({ title: tab.title, url: tab.url }, () => {
          alert('Page bookmarked');
        });
      });

      const removeSingleBtn = document.createElement('button');
      removeSingleBtn.innerText = '✕';
      removeSingleBtn.title = 'Remove page';
      removeSingleBtn.addEventListener('click', () => {
        removeTabFromSession(session.id, index);
      });

      itemActions.appendChild(bookmarkSingleBtn);
      itemActions.appendChild(removeSingleBtn);

      tabItem.appendChild(link);
      tabItem.appendChild(itemActions);
      tabList.appendChild(tabItem);
    });

    card.appendChild(tabList);
    return card;
  }

  // Restore session: opens all tabs in a new window
  function openSession(tabs) {
    if (tabs.length === 0) return;
    const urls = tabs.map(tab => tab.url);
    chrome.windows.create({ url: urls });
  }

  // Delete an entire session
  function deleteSession(id) {
    chrome.storage.local.get({ sessions: [] }, (data) => {
      const updatedSessions = data.sessions.filter(s => s.id !== id);
      chrome.storage.local.set({ sessions: updatedSessions }, () => {
        loadSessions();
      });
    });
  }

  // Rename an existing session
  function renameSession(id, newName) {
    chrome.storage.local.get({ sessions: [] }, (data) => {
      const updatedSessions = data.sessions.map(s => {
        if (s.id === id) {
          s.name = newName;
        }
        return s;
      });
      chrome.storage.local.set({ sessions: updatedSessions });
    });
  }

  // Remove a single tab from a saved session
  function removeTabFromSession(sessionId, tabIndex) {
    chrome.storage.local.get({ sessions: [] }, (data) => {
      const updatedSessions = data.sessions.map(s => {
        if (s.id === sessionId) {
          s.tabs.splice(tabIndex, 1);
        }
        return s;
      }).filter(s => s.tabs.length > 0); // Remove session entirely if empty
      
      chrome.storage.local.set({ sessions: updatedSessions }, () => {
        loadSessions();
      });
    });
  }

  // Bookmark all tabs in a session inside a new folder
  function bookmarkAll(sessionName, tabs) {
    chrome.bookmarks.create({ title: `Session: ${sessionName}` }, (newFolder) => {
      tabs.forEach(tab => {
        chrome.bookmarks.create({
          parentId: newFolder.id,
          title: tab.title,
          url: tab.url
        });
      });
      alert(`All tabs bookmarked under "${sessionName}" folder.`);
    });
  }
});