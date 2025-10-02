import { supabase } from '../../services/supabaseClient';

// Types
export interface TeamMember {
  id: string;
  organization_id: string;
  user_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'admin' | 'member';
  permissions: Record<string, any>;
  status: 'active' | 'inactive' | 'pending';
  invited_at: string;
  joined_at?: string;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface TeamMemberInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  permissions: Record<string, any>;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by?: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  variables: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EmailLog {
  id: string;
  organization_id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  template_id?: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  sent_at: string;
  delivered_at?: string;
  error_message?: string;
  gmail_message_id?: string;
  created_at: string;
  created_by?: string;
}

// Team Service Class
export class TeamService {
  // Get all team members for an organization
  static async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get team members:', error);
      throw error;
    }
  }

  // Get a specific team member
  static async getTeamMember(memberId: string): Promise<TeamMember | null> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) {
        console.error('Error fetching team member:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get team member:', error);
      return null;
    }
  }

  // Add a new team member
  static async addTeamMember(memberData: Partial<TeamMember>): Promise<TeamMember | null> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert([memberData])
        .select()
        .single();

      if (error) {
        console.error('Error adding team member:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to add team member:', error);
      throw error;
    }
  }

  // Update a team member
  static async updateTeamMember(memberId: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('Error updating team member:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update team member:', error);
      throw error;
    }
  }

  // Delete a team member
  static async deleteTeamMember(memberId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error deleting team member:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete team member:', error);
      throw error;
    }
  }

  // Invite a team member
  static async inviteTeamMember(invitationData: {
    organization_id: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    permissions?: Record<string, any>;
    invited_by?: string;
  }): Promise<TeamMemberInvitation | null> {
    try {
      // Generate invitation token
      const invitationToken = crypto.randomUUID();
      
      const invitation = {
        ...invitationData,
        invitation_token: invitationToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      const { data, error } = await supabase
        .from('team_member_invitations')
        .insert([invitation])
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to invite team member:', error);
      throw error;
    }
  }

  // Get pending invitations
  static async getPendingInvitations(organizationId: string): Promise<TeamMemberInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('team_member_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending invitations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get pending invitations:', error);
      throw error;
    }
  }

  // Cancel an invitation
  static async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('team_member_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) {
        console.error('Error cancelling invitation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      throw error;
    }
  }

  // Accept an invitation
  static async acceptInvitation(invitationToken: string, userId: string): Promise<TeamMember | null> {
    try {
      // Get the invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('team_member_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        console.error('Invalid or expired invitation:', invitationError);
        throw new Error('Invalid or expired invitation');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Create team member
      const teamMember = {
        organization_id: invitation.organization_id,
        user_id: userId,
        email: invitation.email,
        first_name: '', // Will be updated when user completes profile
        last_name: '',
        role: invitation.role,
        permissions: invitation.permissions,
        status: 'active' as const,
        joined_at: new Date().toISOString(),
      };

      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .insert([teamMember])
        .select()
        .single();

      if (memberError) {
        console.error('Error creating team member:', memberError);
        throw memberError;
      }

      // Update invitation status
      await supabase
        .from('team_member_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      return member;
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  }

  // Email functionality
  static async sendEmail(emailData: {
    organization_id: string;
    recipient_email: string;
    recipient_name?: string;
    subject: string;
    body: string;
    template_id?: string;
  }): Promise<EmailLog | null> {
    try {
      // Create email log entry
      const emailLog = {
        ...emailData,
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('email_logs')
        .insert([emailLog])
        .select()
        .single();

      if (error) {
        console.error('Error creating email log:', error);
        throw error;
      }

      // TODO: Integrate with Gmail API to actually send the email
      // For now, we'll just log it
      console.log('Email would be sent:', emailData);

      return data;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Get email templates
  static async getEmailTemplates(organizationId: string): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching email templates:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get email templates:', error);
      throw error;
    }
  }

  // Create email template
  static async createEmailTemplate(templateData: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) {
        console.error('Error creating email template:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create email template:', error);
      throw error;
    }
  }

  // Get email logs
  static async getEmailLogs(organizationId: string, limit = 50): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching email logs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get email logs:', error);
      throw error;
    }
  }
}
