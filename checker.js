const querystring = require('querystring');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const spotifydeveloper = new SpotifyWebApi({
  clientid: config.spotify.clientid,
  clientsecret: config.spotify.clientsecret,
  redirect: config.spotify.redirect
});

async function getaccestkn() {
  const data = querystring.stringify({
    grant_type: 'client_credentials',
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(config.spotify.clientid + ':' + config.spotify.clientsecret).toString('base64')}`
    },
    body: data,
  });
  const jsonresponse = await response.json();
  return jsonresponse.access_token;
}

async function getplaylisttracks(playlistid, accestkn) {
  const url = `https://api.spotify.com/v1/playlists/${playlistid}/tracks`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accestkn}`,
    },
  });
  const jsonresponse = await response.json();
  return jsonresponse.items;
}

async function checkifsongexits(trackurl, accestkn) {
  try {
    const response = await fetch(trackurl, {
      headers: {
        'Authorization': `Bearer ${accestkn}`,
      },
    });
    if (!response.ok) {
      throw new Error('song not found');
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function finddeletedsongs(playlistLink) {
  const playlistid = playlistLink.split('/').pop().split('?')[0];
  const accestkn = await getaccestkn();
  const tracks = await getplaylisttracks(playlistid, accestkn);
  const deletedsongs = [];
  for (const trackitem of tracks) {
    const track = trackitem.track;
    if (track && track.external_urls) {
      const trackurl = track.external_urls.spotify;
      const songexits = await checkifsongexits(trackurl, accestkn);
      if (!songexits) {
        deletedsongs.push(trackurl);
      }
    } else {
      console.log('skipping track due to missing track or external_url -> ', trackitem);
    }
  }
  return deletedsongs;
}

const playlistLink = config.playlist.url;
finddeletedsongs(playlistLink)
  .then(deletedsongs => {
    if (deletedsongs.length > 0) {
      console.log('deleted songs -> ', deletedsongs);
    } else {
      console.log('no deleted songs found.');
    }
  })
  .catch(err => console.error(err));
