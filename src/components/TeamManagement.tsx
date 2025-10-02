import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  Eye, 
  Edit, 
  Trash2,
  X,
  Mail,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { TeamService, TeamMember as SupabaseTeamMember, TeamMemberInvitation } from '../lib/services/teamService';
import { GmailService } from '../lib/services/gmailService';
import { useUser } from '@clerk/clerk-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'invited';
  joinedAt: string;
}

interface TeamManagementProps {
  organizationName: string;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ organizationName, onClose }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Mock team members data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Alex Horton',
      email: 'alex@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'member',
      status: 'active',
      joinedAt: '2024-01-20'
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike@example.com',
      role: 'viewer',
      status: 'pending',
      joinedAt: '2024-01-25'
    }
  ]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'invited',
        joinedAt: new Date().toISOString().split('T')[0]
      };

      setTeamMembers(prev => [...prev, newMember]);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'member': return <Edit className="h-4 w-4 text-blue-600" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-600" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-100 text-yellow-800';
      case 'member': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'invited': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
              <p className="text-gray-600 dark:text-gray-300">{organizationName}</p>
            </div>
            <Button variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Invite Section */}
          <Card className="mb-6 dark:bg-gray-700 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <UserPlus className="h-5 w-5" />
                Invite Team Members
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Invite new members to collaborate on your property portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showInviteForm ? (
                <Button onClick={() => setShowInviteForm(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'member' | 'viewer')}
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isInviting}>
                      {isInviting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Team Members List */}
          <Card className="dark:bg-gray-700 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Users className="h-5 w-5" />
                Team Members ({teamMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{member.name}</h3>
                          <Badge className={getStatusBadgeColor(member.status)}>
                            {member.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-300">{member.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-400">Joined {member.joinedAt}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                      
                      {member.role !== 'admin' && (
                        <div className="flex items-center gap-1">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'member' | 'viewer')}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <h3 className="font-medium text-yellow-900">Admin</h3>
                  </div>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Full access to all data</li>
                    <li>• Manage team members</li>
                    <li>• Delete properties and data</li>
                    <li>• Organization settings</li>
                  </ul>
                </div>
                
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Member</h3>
                  </div>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• View and edit data</li>
                    <li>• Upload CSV files</li>
                    <li>• Manage properties</li>
                    <li>• Create reports</li>
                  </ul>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-gray-600" />
                    <h3 className="font-medium text-gray-900">Viewer</h3>
                  </div>
                  <ul className="text-sm text-gray-800 space-y-1">
                    <li>• View data only</li>
                    <li>• Read-only access</li>
                    <li>• Generate reports</li>
                    <li>• No editing permissions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
