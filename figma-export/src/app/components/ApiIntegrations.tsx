import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import MusicPlatformLogos from './MusicPlatformLogos';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Key,
  Link2,
  Webhook,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import { STREAMING_PLATFORMS, type PlatformConfig } from '../utils/apiIntegration';

interface ApiIntegrationsProps {
  onBack: () => void;
}

export function ApiIntegrations({ onBack }: ApiIntegrationsProps) {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(STREAMING_PLATFORMS);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhooks, setWebhooks] = useState([
    {
      id: '1',
      url: 'https://amtdistro.com/webhooks/release-status',
      events: ['release.live', 'release.failed'],
      active: true,
    },
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const handleConnect = (platformId: string) => {
    setPlatforms(
      platforms.map((p) =>
        p.id === platformId
          ? { ...p, status: 'connected', lastSync: new Date() }
          : p
      )
    );
    setSelectedPlatform(null);
    setApiKey('');
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms(
      platforms.map((p) =>
        p.id === platformId ? { ...p, status: 'disconnected', lastSync: undefined } : p
      )
    );
  };

  const handleSync = (platformId: string) => {
    setPlatforms(
      platforms.map((p) =>
        p.id === platformId ? { ...p, lastSync: new Date() } : p
      )
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      connected: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      disconnected: 'bg-gray-100 text-gray-700',
    };

    return (
      <Badge className={variants[status] || variants.disconnected}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const addWebhook = () => {
    if (newWebhookUrl) {
      setWebhooks([
        ...webhooks,
        {
          id: Date.now().toString(),
          url: newWebhookUrl,
          events: ['release.live'],
          active: true,
        },
      ]);
      setNewWebhookUrl('');
    }
  };

  const deleteWebhook = (id: string) => {
    setWebhooks(webhooks.filter((w) => w.id !== id));
  };

  const toggleWebhook = (id: string) => {
    setWebhooks(
      webhooks.map((w) => (w.id === id ? { ...w, active: !w.active } : w))
    );
  };

  return (
    <section className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl sm:text-4xl mb-2">API Integrations</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Connect and manage streaming platform APIs for automated distribution
          </p>
        </div>

        <Tabs defaultValue="platforms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Platform Integrations */}
          <TabsContent value="platforms" className="space-y-4">
            <div className="grid gap-4">
              {platforms.map((platform) => (
                <Card key={platform.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <MusicPlatformLogos platforms={[platform.id]} size={26} hideLabels compact />
                        {getStatusIcon(platform.status)}
                        <h3 className="text-lg sm:text-xl font-medium">{platform.name}</h3>
                        {getStatusBadge(platform.status)}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <p className="mb-1">
                          <span className="font-medium">Auth Type:</span>{' '}
                          {platform.authType.toUpperCase()}
                        </p>
                        {platform.lastSync && (
                          <p>
                            <span className="font-medium">Last Sync:</span>{' '}
                            {new Date(platform.lastSync).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {platform.capabilities.map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {platform.status === 'connected' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(platform.id)}
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(platform.id)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSelectedPlatform(platform)}
                          className="gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Connection Modal */}
            {selectedPlatform && (
              <Card className="p-4 sm:p-6 border-2 border-purple-200 bg-purple-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-medium">
                    Connect to {selectedPlatform.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlatform(null)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-4">
                  {selectedPlatform.authType === 'oauth' ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">OAuth Authentication Required</p>
                            <p>
                              You'll be redirected to {selectedPlatform.name} to authorize AMTDISTRO
                              to distribute your music.
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleConnect(selectedPlatform.id)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Authorize with {selectedPlatform.name}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          placeholder="Enter your API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          You can find your API key in your {selectedPlatform.name} developer
                          dashboard
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleConnect(selectedPlatform.id)}
                        disabled={!apiKey}
                      >
                        Connect
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-medium mb-4">Configure Webhooks</h3>
              <p className="text-sm text-gray-600 mb-6">
                Receive real-time notifications when your releases go live or encounter issues
              </p>

              <div className="space-y-4 mb-6">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Webhook className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <code className="text-sm font-mono truncate">{webhook.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.map((event, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.active}
                        onCheckedChange={() => toggleWebhook(webhook.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <Label htmlFor="newWebhook">Add New Webhook</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="newWebhook"
                    type="url"
                    placeholder="https://your-domain.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addWebhook} disabled={!newWebhookUrl} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-gray-50">
              <h4 className="font-medium mb-3">Available Webhook Events</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'release.submitted',
                  'release.processing',
                  'release.live',
                  'release.failed',
                  'analytics.updated',
                  'payout.processed',
                ].map((event) => (
                  <div
                    key={event}
                    className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                  >
                    <code className="text-xs font-mono text-purple-600">{event}</code>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-medium mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Integration Settings
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Auto-Sync Analytics</h4>
                    <p className="text-sm text-gray-600">
                      Automatically sync analytics data from connected platforms daily
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Batch Upload</h4>
                    <p className="text-sm text-gray-600">
                      Enable batch uploading to multiple platforms simultaneously
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Auto-Retry Failed Uploads</h4>
                    <p className="text-sm text-gray-600">
                      Automatically retry failed uploads up to 3 times
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Email Notifications</h4>
                    <p className="text-sm text-gray-600">
                      Receive email notifications for distribution status changes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="pt-4">
                  <Label htmlFor="rateLimit">API Rate Limit (requests/second)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    defaultValue="10"
                    min="1"
                    max="100"
                    className="mt-2 max-w-xs"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Control the maximum number of API requests per second to avoid rate limiting
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-medium text-yellow-900 mb-1">API Security</h4>
                  <p className="text-yellow-800">
                    Never share your API keys or credentials. AMTDISTRO encrypts all API
                    credentials and stores them securely. You can revoke access at any time.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
