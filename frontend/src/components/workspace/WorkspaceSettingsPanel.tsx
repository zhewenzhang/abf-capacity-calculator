/**
 * WorkspaceSettingsPanel — embedded on the Parameters page.
 *
 * Personal mode shows:
 *   - "Create Shared Workspace From My Current Data" call-to-action
 *   - Current user's UID for sharing
 *
 * Workspace mode shows:
 *   - Workspace name + owner + role tag
 *   - Member list (with role + remove for owners)
 *   - Add-member-by-UID form (owners only)
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { TeamOutlined, UserAddOutlined, CopyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Workspace, WorkspaceRole } from '../../types';

const { Text } = Typography;

const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: 'editor', label: 'Editor (can write)' },
  { value: 'viewer', label: 'Viewer (read-only)' },
];

const WorkspaceSettingsPanel: React.FC = () => {
  const {
    user, scope, workspaces,
    addMember, removeMember, updateMemberRole, getWorkspaceDetail,
    createFromPersonal, reloadWorkspaces,
  } = useWorkspace();

  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loadingWs, setLoadingWs] = useState(false);

  const [inviteForm] = Form.useForm();
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (scope.mode !== 'workspace' || !scope.workspaceId) {
      setWorkspace(null);
      return;
    }
    setLoadingWs(true);
    getWorkspaceDetail(scope.workspaceId)
      .then((ws) => setWorkspace(ws))
      .catch(() => setWorkspace(null))
      .finally(() => setLoadingWs(false));
  }, [scope, getWorkspaceDetail]);

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      messageApi.success('Your Google UID has been copied.');
    } catch {
      messageApi.error('Copy failed. UID: ' + user.uid);
    }
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      messageApi.warning('Please enter a workspace name.');
      return;
    }
    setCreating(true);
    try {
      await createFromPersonal(name);
      messageApi.success(`Workspace "${name}" created from your personal data. You are now editing the shared workspace.`);
      setCreateOpen(false);
      setCreateName('');
    } catch (err: any) {
      messageApi.error(err?.message || 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  const isOwner = scope.mode === 'workspace' && workspace?.ownerId === user.uid;

  const refreshWorkspace = async () => {
    if (scope.mode !== 'workspace' || !scope.workspaceId) return;
    const ws = await getWorkspaceDetail(scope.workspaceId);
    setWorkspace(ws);
    await reloadWorkspaces();
  };

  const handleInvite = async () => {
    const values = await inviteForm.validateFields();
    const uid = (values.uid as string).trim();
    const role = values.role as WorkspaceRole;
    if (!scope.workspaceId) return;
    setInviting(true);
    try {
      await addMember(scope.workspaceId, uid, role);
      messageApi.success(`Member ${uid.slice(0, 8)}… added as ${role}.`);
      inviteForm.resetFields(['uid']);
      await refreshWorkspace();
    } catch (err: any) {
      messageApi.error(err?.message || 'Failed to add member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberUid: string, role: WorkspaceRole) => {
    if (!scope.workspaceId) return;
    try {
      await updateMemberRole(scope.workspaceId, memberUid, role);
      messageApi.success('Role updated.');
      await refreshWorkspace();
    } catch (err: any) {
      messageApi.error(err?.message || 'Failed to update role.');
    }
  };

  const handleRemove = async (memberUid: string) => {
    if (!scope.workspaceId) return;
    try {
      await removeMember(scope.workspaceId, memberUid);
      messageApi.success('Member removed.');
      await refreshWorkspace();
    } catch (err: any) {
      messageApi.error(err?.message || 'Failed to remove member.');
    }
  };

  const memberRows = workspace
    ? Object.entries(workspace.members).map(([uid, role]) => ({ uid, role }))
    : [];

  return (
    <Card
      title={<Space><TeamOutlined /><span>Workspace Settings</span></Space>}
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Tag color={scope.mode === 'workspace' ? 'blue' : 'default'}>
          {scope.mode === 'workspace' ? 'Shared workspace' : 'Personal'}
        </Tag>
      }
    >
      {contextHolder}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="Invites are UID-based, not email."
          description={
            <Space direction="vertical" size={4}>
              <Text>This MVP does not send email invitations. To invite a colleague:</Text>
              <Text>1. They sign in here with their Google account.</Text>
              <Text>2. They open Parameters → Workspace Settings and copy their Google UID.</Text>
              <Text>3. They paste that UID into Slack / email / chat and send it to you.</Text>
              <Text>4. You (the workspace owner) paste their UID below and pick a role.</Text>
              <Text type="secondary">
                Entering an email address will not work — Firebase Auth does not expose
                other accounts' UIDs by email lookup from the client. Email-link invites are tracked for a future release.
              </Text>
            </Space>
          }
        />

        <Space wrap>
          <Text type="secondary">Your Google UID:</Text>
          <Text code>{user.uid}</Text>
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopyUid}>Copy</Button>
          <Text type="secondary">— share this with a workspace owner who wants to invite you.</Text>
        </Space>

        {scope.mode === 'personal' && (
          <>
            <Alert
              type="info"
              showIcon
              message="You are working in your Personal Workspace."
              description={
                workspaces.length === 0
                  ? "Your data is private. To collaborate with a colleague, create a Shared Workspace from your current data."
                  : `You also have access to ${workspaces.length} shared workspace(s). Use the Workspace switcher in the header to enter them.`
              }
            />
            <Space>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setCreateOpen(true)}
              >
                Create Shared Workspace From My Current Data
              </Button>
            </Space>
          </>
        )}

        {scope.mode === 'workspace' && (
          <>
            {loadingWs ? (
              <Text type="secondary">Loading workspace…</Text>
            ) : workspace ? (
              <>
                <Space wrap>
                  <Text strong>Workspace:</Text>
                  <Text>{workspace.name}</Text>
                  <Tag color={scope.role === 'owner' ? 'gold' : scope.role === 'editor' ? 'blue' : 'default'}>
                    your role: {scope.role}
                  </Tag>
                  <Text type="secondary">owner UID: {workspace.ownerId}</Text>
                </Space>

                <Table
                  size="small"
                  rowKey="uid"
                  pagination={false}
                  dataSource={memberRows}
                  columns={[
                    {
                      title: 'Member UID', dataIndex: 'uid', key: 'uid',
                      render: (uid: string) => (
                        <Space>
                          <Text code style={{ fontSize: 12 }}>{uid}</Text>
                          {uid === user.uid && <Tag color="green">you</Tag>}
                          {uid === workspace.ownerId && <Tag color="gold">owner</Tag>}
                        </Space>
                      ),
                    },
                    {
                      title: 'Role', dataIndex: 'role', key: 'role',
                      width: 180,
                      render: (role: WorkspaceRole, record: { uid: string }) => {
                        if (record.uid === workspace.ownerId) {
                          return <Tag color="gold">owner</Tag>;
                        }
                        if (!isOwner) {
                          return <Tag>{role}</Tag>;
                        }
                        return (
                          <Select
                            size="small"
                            value={role}
                            style={{ width: 160 }}
                            options={ROLE_OPTIONS}
                            onChange={(value) => handleRoleChange(record.uid, value)}
                          />
                        );
                      },
                    },
                    {
                      title: 'Actions', key: 'actions', width: 120,
                      render: (_: unknown, record: { uid: string }) => {
                        if (!isOwner || record.uid === workspace.ownerId) return null;
                        return (
                          <Popconfirm
                            title={`Remove member ${record.uid.slice(0, 8)}…?`}
                            onConfirm={() => handleRemove(record.uid)}
                          >
                            <Button size="small" danger>Remove</Button>
                          </Popconfirm>
                        );
                      },
                    },
                  ]}
                />

                {isOwner && (
                  <Form
                    form={inviteForm}
                    layout="vertical"
                    initialValues={{ role: 'editor' as WorkspaceRole }}
                    onFinish={handleInvite}
                  >
                    <Form.Item
                      name="uid"
                      label={
                        <Space>
                          <Text strong>Invite by Google UID</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            (not email — ask your colleague to copy theirs from Parameters → Workspace Settings)
                          </Text>
                        </Space>
                      }
                      rules={[
                        { required: true, message: 'Paste the colleague\'s Google UID (not their email).' },
                        {
                          validator: (_, value: string) => {
                            if (!value) return Promise.resolve();
                            if (value.includes('@')) {
                              return Promise.reject(new Error(
                                'Looks like an email address. We need their Google UID — ask them to copy it from Parameters → Workspace Settings.'
                              ));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        style={{ maxWidth: 480 }}
                        placeholder="paste a Google UID, e.g. xQ1abcDeFg... (28-character string)"
                      />
                    </Form.Item>
                    <Space>
                      <Form.Item name="role" label="Role" style={{ marginBottom: 0 }}>
                        <Select style={{ width: 200 }} options={ROLE_OPTIONS} />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0, alignSelf: 'flex-end' }}>
                        <Button type="primary" htmlType="submit" icon={<UserAddOutlined />} loading={inviting}>
                          Add member
                        </Button>
                      </Form.Item>
                    </Space>
                  </Form>
                )}

                {!isOwner && (
                  <Alert type="info" showIcon message="Only the workspace owner can add or remove members." />
                )}
              </>
            ) : (
              <Alert type="warning" showIcon message="Could not load workspace details." />
            )}
          </>
        )}
      </Space>

      <Modal
        title="Create Shared Workspace"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Create + switch"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            This will <strong>copy</strong> your Products, Forecasts, Capacity Plans, and Parameters
            into a new shared workspace. Your personal data remains untouched.
          </Text>
          <Input
            placeholder="e.g. ABF Capacity Planning – 2026"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onPressEnter={handleCreate}
          />
        </Space>
      </Modal>
    </Card>
  );
};

export default WorkspaceSettingsPanel;
