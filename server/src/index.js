const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Initialize Google Drive API
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Function to get or create the notes folder
async function getOrCreateNotesFolder(tokens) {
  oauth2Client.setCredentials(tokens);
  
  // Search for the folder
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Notes App' and trashed=false",
    fields: 'files(id, name)',
  });

  if (response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create the folder if it doesn't exist
  const folderMetadata = {
    name: 'Notes App',
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });

  return folder.data.id;
}

// Get authorization URL
app.get('/auth/google', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate auth URL',
      details: error.message 
    });
  }
});

// Handle OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Received tokens:', tokens);
    oauth2Client.setCredentials(tokens);
    // Redirect to the client with the tokens
    res.redirect(`http://localhost:3000/auth/callback?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
  } catch (error) {
    console.error('Error in callback:', error);
    res.redirect(`http://localhost:3000/auth/callback?error=${encodeURIComponent(error.message)}`);
  }
});

// Get all notes from Google Drive
app.get('/api/notes', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const tokens = JSON.parse(authHeader.split('Bearer ')[1]);
    oauth2Client.setCredentials(tokens);

    // Get or create the notes folder
    const folderId = await getOrCreateNotesFolder(tokens);

    // Get all files in the folder with their content in a single request
    const response = await drive.files.list({
      q: `mimeType='text/plain' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, description)',
      orderBy: 'createdTime desc'
    });

    const notes = response.data.files.map(file => ({
      id: file.id,
      title: file.name.replace('.txt', ''),
      content: file.description || '', // Use description field for content
      createdTime: file.createdTime,
    }));

    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      details: error.message 
    });
  }
});

// Save note to Google Drive
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const tokens = JSON.parse(authHeader.split('Bearer ')[1]);
    oauth2Client.setCredentials(tokens);

    const folderId = await getOrCreateNotesFolder(tokens);

    const fileMetadata = {
      name: `${title || 'Untitled'}.txt`,
      mimeType: 'text/plain',
      parents: [folderId],
      description: content || '' // Store content in the description field
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, createdTime, description'
    });

    // Return the created note
    res.json({
      id: file.data.id,
      title: file.data.name.replace('.txt', ''),
      content: file.data.description || '',
      createdTime: file.data.createdTime,
      success: true
    });
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ 
      error: 'Failed to save note',
      details: error.message 
    });
  }
});

// Update note in Google Drive
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const tokens = JSON.parse(authHeader.split('Bearer ')[1]);
    oauth2Client.setCredentials(tokens);

    const fileMetadata = {
      name: `${title || 'Untitled'}.txt`,
      description: content || '' // Store content in the description field
    };

    const file = await drive.files.update({
      fileId: id,
      resource: fileMetadata,
      fields: 'id, name, createdTime, description'
    });

    // Return the updated note
    res.json({
      id: file.data.id,
      title: file.data.name.replace('.txt', ''),
      content: file.data.description || '',
      createdTime: file.data.createdTime,
      success: true
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ 
      error: 'Failed to update note',
      details: error.message 
    });
  }
});

// Delete note from Google Drive
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the tokens from the request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const tokens = JSON.parse(authHeader.split('Bearer ')[1]);
    oauth2Client.setCredentials(tokens);

    await drive.files.delete({
      fileId: id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ 
      error: 'Failed to delete note',
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 