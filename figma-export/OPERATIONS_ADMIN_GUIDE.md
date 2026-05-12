# Operations Admin Guide

## Role Overview
**Operations Admin** (`admin_operations`) handles daily platform moderation for AMTDISTRO.

---

## What You Can Do

### ✅ User Management
- **View all users** - See artist and label profiles
- Cannot edit, delete, or ban users

### ✅ Upload Approvals
- **View all tracks** - See pending and approved uploads
- **Edit metadata** - Fix typos, correct information
- **Approve/Reject uploads** - Quality control for new releases
  - Check audio quality
  - Verify metadata accuracy
  - Ensure artwork meets standards
  - Confirm copyright compliance

### ✅ Content Moderation
- **Flag suspicious activity** - Report fraudulent uploads
- **View fraud reports** - Monitor platform security
- Cannot investigate or resolve fraud cases (escalate to Fraud Admin)

### ✅ Payout Management
- **View payout requests** - See pending withdrawals
- **Approve payouts** - Process standard payouts
- Cannot cancel or issue refunds

### ✅ Analytics
- **View platform analytics** - Monitor platform health
  - Total users
  - Upload trends
  - Distribution status
  - Revenue metrics

### ✅ Service Monitoring
- **Public health endpoint** - Use https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-health for unauthenticated uptime checks
- **Protected API health route** - The main make-server-79198001 function keeps JWT protection enabled

---

## What You Cannot Do

### ❌ User Management
- Delete users permanently
- Ban user accounts
- Verify user accounts

### ❌ Financial Operations
- Edit royalty records
- Cancel payments
- Issue refunds
- View detailed financial data (Finance Admin only)

### ❌ System Administration
- Access system settings
- Create/delete admin users
- Modify admin permissions
- View complete audit logs

### ❌ Advanced Actions
- Take down releases (Content Admin or Fraud Admin)
- Investigate fraud cases (Fraud Admin)
- Retry failed distributions (Content Admin)

---

## Daily Workflow

### Morning Tasks
1. Check pending upload queue
2. Review flagged content from previous day
3. Process payout requests
4. Check platform analytics for anomalies

### Upload Approval Checklist
For each new upload:
- [ ] Audio file meets quality standards (WAV/FLAC)
- [ ] Artwork is 3000x3000px minimum
- [ ] Artist name is correct
- [ ] Track title has no typos
- [ ] Genre is appropriate
- [ ] Release date is valid
- [ ] No copyright violations suspected
- [ ] ISRC/UPC assigned correctly

### Content Moderation
If you find suspicious content:
1. Flag the upload
2. Document the issue
3. Escalate to Fraud Admin
4. Do not approve the upload

### Payout Processing
Standard payout approval criteria:
- Minimum balance met (₦5,000)
- Payment details verified
- No fraud flags on account
- Royalty data validated

---

## Escalation Procedures

### When to Escalate

**To Super Admin:**
- User requests account deletion
- System errors or bugs
- Policy questions

**To Finance Admin:**
- Payout disputes
- Royalty calculation issues
- Tax documentation questions

**To Content Admin:**
- Distribution failures
- Release takedown requests
- Bulk metadata edits

**To Fraud Admin:**
- Suspected fraud
- Copyright infringement
- Multiple suspicious uploads
- Unusual account activity

**To Support Admin:**
- User complaints
- Account access issues
- General support tickets

---

## Common Scenarios

### Scenario 1: Upload with Poor Metadata
**Issue:** Track title is "Track 1" with no artist info  
**Action:**
1. Use `releases.edit` permission
2. Contact artist for correct information
3. Update metadata
4. Approve once corrected

### Scenario 2: Suspicious Multiple Uploads
**Issue:** New user uploaded 50 tracks in one day  
**Action:**
1. Use `fraud.flag_users` permission
2. Flag the account
3. Document pattern
4. Escalate to Fraud Admin
5. Hold all approvals pending investigation

### Scenario 3: Payout Request Without Bank Info
**Issue:** Artist requests payout but no payment method on file  
**Action:**
1. View payout request
2. Check payment details
3. Contact user to add bank account
4. Approve once details added

### Scenario 4: User Wants to Delete Account
**Issue:** Artist wants to delete their account  
**Action:**
1. You cannot delete users
2. Escalate to Super Admin
3. Inform user of timeline

---

## Performance Metrics

Track your daily performance:
- **Uploads Approved:** Target 50+ per day
- **Response Time:** < 24 hours for approvals
- **Payout Processing:** < 48 hours
- **Accuracy Rate:** 95%+ approval accuracy

---

## Best Practices

### Quality Control
- Never rush approvals
- When in doubt, ask for clarification
- Document all decisions
- Be consistent with standards

### Communication
- Reply to artists within 24 hours
- Be professional and helpful
- Provide clear rejection reasons
- Offer solutions when possible

### Security
- Flag suspicious activity immediately
- Don't approve questionable content
- Verify copyright claims
- Protect user data privacy

### Efficiency
- Process approvals in batches
- Use keyboard shortcuts
- Set up notification preferences
- Prioritize urgent requests

---

## Resources

### Documentation
- [Main Role System Guide](/ROLE_SYSTEM.md)
- Platform guidelines (internal wiki)
- Content standards document

### Support Contacts
- **Super Admin:** admin@amtdistro.com
- **Finance Team:** finance@amtdistro.com
- **Content Team:** content@amtdistro.com
- **Fraud Team:** fraud@amtdistro.com

### Tools
- Admin dashboard: `/admin`
- Analytics panel: `/admin/analytics`
- Approval queue: `/admin/releases`
- Payout queue: `/admin/payouts`

---

## Training & Onboarding

### Week 1: Learn the Basics
- Understand platform features
- Review content standards
- Shadow experienced admin
- Practice metadata editing

### Week 2: Start Approvals
- Process low-risk uploads
- Review decisions with supervisor
- Learn fraud patterns
- Handle payout approvals

### Week 3: Full Responsibility
- Independent approval authority
- Handle escalations
- Monitor analytics
- Provide feedback to team

---

## FAQs

**Q: How long should upload approval take?**  
A: Maximum 24 hours from submission.

**Q: What if I'm unsure about an upload?**  
A: Escalate to Content Admin rather than guessing.

**Q: Can I approve my friend's upload?**  
A: No. Escalate to another admin to avoid conflict of interest.

**Q: What happens if I approve fraudulent content?**  
A: All actions are logged. Repeated mistakes may result in role adjustment.

**Q: How do I handle angry artists?**  
A: Stay professional, explain the issue, escalate to Support Admin if needed.

**Q: Can I work remotely?**  
A: Yes, but ensure secure connection and proper access controls.

---

## Emergency Contacts

- **Platform Down:** Call Super Admin immediately
- **Security Breach:** Contact Fraud Admin + Super Admin
- **Mass Fraud Attack:** Initiate emergency protocol
- **Legal Issues:** Escalate to Super Admin + Legal team

---

## Version History
- v1.0 - March 2026 - Initial Operations Admin role created
