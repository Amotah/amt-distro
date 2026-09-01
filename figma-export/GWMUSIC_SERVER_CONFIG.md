# GWMusic Smart Links — Server Configuration Guide

**Domain:** gwmusic.com.ng  
**Smart Link Format:** `https://gwmusic.com.ng/s/artist-song` or `https://gwmusic.com.ng/artist-song`  
**Server Type:** Traditional Web Server (Node.js/Express, Flask, Django, etc.)  
**Hosting:** Custom Server (Not Vercel/Netlify)  

---

## 🎯 Routing Requirements

Your server must handle **two types of routes**:

### Route 1: Explicit Prefix `/s/slug`
```
https://gwmusic.com.ng/s/artist-song
    ↓
React app extracts slug: "artist-song"
    ↓
SmartLinkRedirectPage fetches from database
    ↓
Redirects to first available DSP (Spotify, Boomplay, etc.)
```

### Route 2: Catch-all `/slug` (Optional but Recommended)
```
https://gwmusic.com.ng/summer-vibes
    ↓
React app extracts slug: "summer-vibes"
    ↓
Same flow as /s/slug
```

### Route 3: Dashboard & Public Pages
```
https://gwmusic.com.ng/dashboard       → React app
https://gwmusic.com.ng/login           → React app
https://gwmusic.com.ng/admin           → React app
```

---

## 🔧 Server Configuration by Platform

Choose your server type below:

### **Option 1: Node.js + Express (Most Common)**

Install Express:
```bash
npm install express
npm install compression
```

Create `server.js` (add to root of project):
```javascript
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();

// Enable compression
app.use(compression());

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Route: Specific smart links prefix /s/:slug
app.get('/s/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Route: Catch-all for single segment (artist-song)
app.get('/:slug', (req, res) => {
  // Exclude dashboard and admin routes
  const blocked = ['dashboard', 'admin', 'label-dashboard', 'api', 'login', 'signup', 'about', 'contact'];
  
  if (blocked.includes(req.params.slug.toLowerCase())) {
    res.status(404).sendFile(path.join(__dirname, 'dist/index.html'));
    return;
  }
  
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Route: All other requests → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎵 GWMusic server running on port ${PORT}`);
  console.log(`   Smart links: https://gwmusic.com.ng/s/artist-song`);
});
```

Update `package.json`:
```json
{
  "scripts": {
    "build": "vite build",
    "start": "node server.js",
    "dev": "vite"
  }
}
```

Deploy:
```bash
npm run build
npm start
```

---

### **Option 2: Python + Flask**

Install Flask:
```bash
pip install flask
```

Create `server.py`:
```python
from flask import Flask, send_from_directory, redirect
import os

app = Flask(__name__, static_folder='dist', static_url_path='')

# Blocked routes (don't treat as smart links)
BLOCKED_ROUTES = {'dashboard', 'admin', 'label-dashboard', 'api', 'login', 'signup', 'about', 'contact'}

@app.route('/s/<slug>')
def smart_link_prefix(slug):
    """Handle /s/slug format"""
    return send_from_directory('dist', 'index.html')

@app.route('/<slug>')
def smart_link_catch_all(slug):
    """Handle /slug catch-all format"""
    if slug.lower() in BLOCKED_ROUTES:
        return send_from_directory('dist', 'index.html')
    return send_from_directory('dist', 'index.html')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    """Serve index.html for all other routes (SPA)"""
    if os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=False)
```

Deploy:
```bash
python server.py
```

---

### **Option 3: Nginx (Reverse Proxy)**

If running Node.js app on port 3000, configure Nginx:

**File:** `/etc/nginx/sites-available/gwmusic.com.ng`

```nginx
server {
    listen 80;
    server_name gwmusic.com.ng www.gwmusic.com.ng;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gwmusic.com.ng www.gwmusic.com.ng;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/gwmusic.com.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gwmusic.com.ng/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/gwmusic.com.ng /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### **Option 4: Apache (Reverse Proxy)**

**File:** `/etc/apache2/sites-available/gwmusic.com.ng.conf`

```apache
<VirtualHost *:80>
    ServerName gwmusic.com.ng
    ServerAlias www.gwmusic.com.ng
    
    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName gwmusic.com.ng
    ServerAlias www.gwmusic.com.ng
    
    # SSL configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/gwmusic.com.ng/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/gwmusic.com.ng/privkey.pem
    
    # Proxy to Node.js
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    
    # Cache static assets
    <FilesMatch "\\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>
</VirtualHost>
```

Enable and restart:
```bash
sudo a2ensite gwmusic.com.ng.conf
sudo a2enmod rewrite proxy proxy_http ssl
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## 🔐 SSL/HTTPS Setup

**Critical:** Smart links MUST use HTTPS. Users won't share HTTP links.

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx  # For Nginx
# OR
sudo apt-get install certbot python3-certbot-apache  # For Apache

# Get certificate
sudo certbot certonly --standalone -d gwmusic.com.ng -d www.gwmusic.com.ng

# Auto-renewal
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

---

## 📝 Environment Variables

Create `.env` file in project root:

```env
# API Configuration
VITE_SUPABASE_URL=https://vatpvfrbgeatdeypqcrv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3000
NODE_ENV=production

# Domain
DOMAIN=gwmusic.com.ng
SMART_LINK_PREFIX=/s/
```

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Build React app: `npm run build`
- [ ] Test locally: `npm start`
- [ ] Server routing working:
  - [ ] `https://gwmusic.com.ng/s/test` → index.html
  - [ ] `https://gwmusic.com.ng/test` → index.html
  - [ ] `https://gwmusic.com.ng/dashboard` → index.html
  - [ ] `https://gwmusic.com.ng/admin` → index.html
- [ ] API working: Check Supabase connection
- [ ] SSL certificate installed and valid
- [ ] DNS pointing to server
- [ ] Performance: Test smart link redirect (<2 seconds)

### Post-Deployment Validation

1. **Create test smart link** via dashboard
2. **Copy link:** `https://gwmusic.com.ng/s/test-song`
3. **Test across browsers:**
   - ✓ Chrome
   - ✓ Firefox
   - ✓ Safari
   - ✓ Mobile
4. **Test private window** (simulates new user)
5. **Check analytics** appear in dashboard

---

## 🧪 Testing Commands

### Test Smart Link Routing

```bash
# Test /s/ prefix
curl -I https://gwmusic.com.ng/s/artist-song
# Should return 200, not 404

# Test catch-all
curl -I https://gwmusic.com.ng/artist-song
# Should return 200

# Test blocked routes
curl -I https://gwmusic.com.ng/dashboard
# Should return 200 (serves index.html)
```

### Test API Connectivity

```bash
# Verify Supabase connection
curl https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-health

# Should return: {"status":"healthy"}
```

---

## 🐛 Troubleshooting

### Issue: Smart link returns 404

**Solution:**
1. Verify server routing config (see options above)
2. Check logs: `tail -f /var/log/nginx/error.log` (Nginx)
3. Ensure `/s/` route catches requests
4. Test: `curl -v https://gwmusic.com.ng/s/test`

### Issue: React app not loading (blank page)

**Solution:**
1. Check build: `npm run build` (look for errors)
2. Verify `dist/index.html` exists
3. Check server serves static files correctly
4. Browser DevTools → Console (check for JS errors)

### Issue: API calls failing (CORS)

**Solution:**
1. Supabase URL must be set in `.env`: `VITE_SUPABASE_URL=...`
2. Verify `.env` passed to build: `echo $VITE_SUPABASE_URL`
3. Check browser → Network tab (what's the actual URL?)

### Issue: Slow redirects

**Solution:**
1. Check Supabase health: `curl https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-health`
2. Enable caching in server (see Nginx/Apache configs above)
3. Monitor: Use `curl -w "@curl-format.txt" -o /dev/null -s ...` to measure request time

---

## 📊 Monitoring

### Production Health Check

Add to crontab (runs every 5 minutes):

```bash
*/5 * * * * curl -f https://gwmusic.com.ng/s/test-link || mail -s "GWMusic Alert: Smart link down" admin@gwmusic.com.ng
```

### View Server Logs

```bash
# Node.js
tail -f nohup.out

# Nginx
tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Apache
tail -f /var/log/apache2/access.log /var/log/apache2/error.log

# Python Flask
# (logs to console)
```

---

## 🎊 Summary

| Step | Status |
|------|--------|
| ✅ React app built | Use `npm run build` |
| ✅ Server routing configured | Choose Option 1-4 above |
| ✅ Environment variables set | Create `.env` file |
| ✅ SSL/HTTPS enabled | Use Let's Encrypt |
| ✅ DNS pointing to server | gwmusic.com.ng → your.server.ip |
| ✅ Smart links working | Test /s/slug format |

---

## 📚 Next Steps

1. **Deploy this week:**
   - [ ] Setup server (Express/Flask/Nginx)
   - [ ] Upload build to server
   - [ ] Test routing
   - [ ] Point DNS to server

2. **This month:**
   - [ ] Monitor analytics
   - [ ] Create marketing smart links
   - [ ] Share with artists

3. **Future enhancements:**
   - [ ] Custom subdomain: link.gwmusic.com.ng
   - [ ] QR code generation
   - [ ] Geo-targeted redirects
   - [ ] A/B testing for DSP preference

---

**Questions?** Check `SMARTLINK_DOMAIN_SOLUTION.md` for more details.
