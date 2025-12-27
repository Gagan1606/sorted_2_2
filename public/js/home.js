const API_BASE = '/api';

let currentUser = null;
let detectedUsersData = [];
let pendingGroupData = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/current-user`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'index.html';
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        document.getElementById('username-display').textContent = currentUser.username;
    } catch (error) {
        window.location.href = 'index.html';
    }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    window.location.href = 'index.html';
});

// Modal controls
const createGroupModal = document.getElementById('createGroupModal');
const instantShareModal = document.getElementById('instantShareModal');

document.getElementById('createGroupBtn').addEventListener('click', () => {
    createGroupModal.style.display = 'block';
});

document.getElementById('instantShareBtn').addEventListener('click', () => {
    instantShareModal.style.display = 'block';
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

// Create Group Form
document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const groupName = document.getElementById('groupName').value;
    const photos = document.getElementById('groupPhotos').files;
    
    if (photos.length === 0) {
        alert('Please select photos');
        return;
    }
    
    const formData = new FormData();
    formData.append('groupName', groupName);
    
    for (let photo of photos) {
        formData.append('photos', photo);
    }
    
    const progressDiv = document.getElementById('upload-progress');
    progressDiv.textContent = 'Processing photos...';
    
    try {
        const response = await fetch(`${API_BASE}/create-group`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // FIX 2: Show detected users for confirmation
            detectedUsersData = data.detectedUsers;
            pendingGroupData = { groupId: data.groupId, groupName };
            
            document.getElementById('createGroupForm').style.display = 'none';
            progressDiv.style.display = 'none';
            
            const detectedSection = document.getElementById('detectedUsersSection');
            detectedSection.style.display = 'block';
            
            displayDetectedUsers();
        } else {
            alert(data.error || 'Failed to create group');
            progressDiv.textContent = '';
        }
    } catch (error) {
        console.error('Create group error:', error);
        alert('Failed to create group');
        progressDiv.textContent = '';
    }
});

function displayDetectedUsers() {
    const listDiv = document.getElementById('detectedUsersList');
    listDiv.innerHTML = '';
    
    detectedUsersData.forEach((user, index) => {
        const tag = document.createElement('div');
        tag.className = 'user-tag';
        tag.innerHTML = `
            ${user.username}
            <button onclick="removeDetectedUser(${index})">×</button>
        `;
        listDiv.appendChild(tag);
    });
}

function removeDetectedUser(index) {
    detectedUsersData.splice(index, 1);
    displayDetectedUsers();
}

// Add additional user
document.getElementById('addUserBtn').addEventListener('click', () => {
    const username = document.getElementById('additionalUsername').value.trim();
    if (username) {
        detectedUsersData.push({ username });
        displayDetectedUsers();
        document.getElementById('additionalUsername').value = '';
    }
});

// Confirm group creation
document.getElementById('confirmGroupBtn').addEventListener('click', async () => {
    // Add additional members to group
    for (const user of detectedUsersData) {
        await fetch(`${API_BASE}/add-member-to-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: pendingGroupData.groupId,
                username: user.username
            }),
            credentials: 'include'
        });
    }
    
    alert('Group created successfully!');
    createGroupModal.style.display = 'none';
    loadGroups();
    
    // Reset form
    document.getElementById('createGroupForm').reset();
    document.getElementById('createGroupForm').style.display = 'block';
    document.getElementById('detectedUsersSection').style.display = 'none';
});

// Instant Share
document.getElementById('instantShareForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const photo = document.getElementById('sharePhoto').files[0];
    
    if (!photo) {
        alert('Please select a photo');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo', photo);
    
    try {
        const response = await fetch(`${API_BASE}/instant-share`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const resultDiv = document.getElementById('shareResult');
            if (data.sentTo.length > 0) {
                resultDiv.innerHTML = `<p>Photo shared with: ${data.sentTo.join(', ')}</p>`;
            } else {
                resultDiv.innerHTML = `<p>No faces detected in photo</p>`;
            }
        }
    } catch (error) {
        console.error('Instant share error:', error);
        alert('Failed to share photo');
    }
});

// Load and display groups
document.getElementById('viewGroupsBtn').addEventListener('click', loadGroups);

async function loadGroups() {
    try {
        const response = await fetch(`${API_BASE}/my-groups`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const groupsList = document.getElementById('groupsList');
            groupsList.innerHTML = '';
            
            data.groups.forEach(group => {
                const card = document.createElement('div');
                card.className = 'group-card';
                card.innerHTML = `
                    <h3>${group.groupName}</h3>
                    <p>Created by: ${group.createdBy.username}</p>
                    <p>${new Date(group.createdAt).toLocaleDateString()}</p>
                `;
                card.addEventListener('click', () => {
                    window.location.href = `group.html?id=${group._id}`;
                });
                groupsList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Load groups error:', error);
    }
}

// Initialize
// ============================================
// SHARED PHOTOS FUNCTIONALITY
// ============================================

// View shared photos button
document.getElementById('viewSharedBtn').addEventListener('click', () => {
    document.getElementById('groupsList').style.display = 'none';
    document.getElementById('sharedPhotosSection').style.display = 'block';
    loadSharedWithMe();
});

// Close shared section
document.getElementById('closeSharedBtn').addEventListener('click', () => {
    document.getElementById('sharedPhotosSection').style.display = 'none';
    document.getElementById('groupsList').style.display = 'grid';
});

// Tab switching
document.getElementById('sharedWithMeTab').addEventListener('click', () => {
    document.getElementById('sharedWithMeTab').classList.add('active');
    document.getElementById('sharedByMeTab').classList.remove('active');
    document.getElementById('sharedWithMeContent').style.display = 'block';
    document.getElementById('sharedByMeContent').style.display = 'none';
    loadSharedWithMe();
});

document.getElementById('sharedByMeTab').addEventListener('click', () => {
    document.getElementById('sharedByMeTab').classList.add('active');
    document.getElementById('sharedWithMeTab').classList.remove('active');
    document.getElementById('sharedByMeContent').style.display = 'block';
    document.getElementById('sharedWithMeContent').style.display = 'none';
    loadSharedByMe();
});

// Load photos shared with current user
async function loadSharedWithMe() {
    try {
        const response = await fetch(`${API_BASE}/shared-with-me`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('sharedWithMePhotos');
            container.innerHTML = '';
            
            if (data.photos.length === 0) {
                container.innerHTML = '<p class="empty-message">No photos shared with you yet</p>';
                return;
            }
            
            data.photos.forEach(photo => {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'photo-item' + (photo.viewed ? '' : ' unviewed');
                
                const img = document.createElement('img');
                img.src = `data:${photo.contentType};base64,${photo.photoData}`;
                img.addEventListener('click', () => {
                    markAsViewed(photo._id);
                    // Open full size view
                    const fullView = window.open('', '_blank');
                    fullView.document.write(`<img src="${img.src}" style="max-width:100%;height:auto;">`);
                });
                
                const info = document.createElement('div');
                info.className = 'photo-info';
                info.innerHTML = `
                    <p><strong>From:</strong> ${photo.sharedBy}</p>
                    <p><strong>Date:</strong> ${new Date(photo.sharedAt).toLocaleDateString()}</p>
                    <p><strong>People:</strong> ${photo.detectedFaces.map(f => f.username).join(', ')}</p>
                    ${!photo.viewed ? '<span class="badge-new">NEW</span>' : ''}
                `;
                
                photoDiv.appendChild(img);
                photoDiv.appendChild(info);
                container.appendChild(photoDiv);
            });
        }
    } catch (error) {
        console.error('Error loading shared photos:', error);
        alert('Failed to load shared photos');
    }
}

// Load photos shared by current user
async function loadSharedByMe() {
    try {
        const response = await fetch(`${API_BASE}/shared-by-me`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('sharedByMePhotos');
            container.innerHTML = '';
            
            if (data.photos.length === 0) {
                container.innerHTML = '<p class="empty-message">You haven\'t shared any photos yet</p>';
                return;
            }
            
            data.photos.forEach(photo => {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'photo-item';
                
                const img = document.createElement('img');
                img.src = `data:${photo.contentType};base64,${photo.photoData}`;
                img.addEventListener('click', () => {
                    const fullView = window.open('', '_blank');
                    fullView.document.write(`<img src="${img.src}" style="max-width:100%;height:auto;">`);
                });
                
                const info = document.createElement('div');
                info.className = 'photo-info';
                info.innerHTML = `
                    <p><strong>Shared with:</strong> ${photo.sharedWith.join(', ')}</p>
                    <p><strong>Date:</strong> ${new Date(photo.sharedAt).toLocaleDateString()}</p>
                    <p><strong>Views:</strong> ${photo.viewCount}/${photo.sharedWith.length}</p>
                `;
                
                photoDiv.appendChild(img);
                photoDiv.appendChild(info);
                container.appendChild(photoDiv);
            });
        }
    } catch (error) {
        console.error('Error loading shared photos:', error);
        alert('Failed to load shared photos');
    }
}

// Mark photo as viewed
async function markAsViewed(photoId) {
    try {
        await fetch(`${API_BASE}/mark-viewed/${photoId}`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Refresh the list to update badge
        loadSharedWithMe();
    } catch (error) {
        console.error('Error marking photo as viewed:', error);
    }
}

// Initialize
checkAuth();
