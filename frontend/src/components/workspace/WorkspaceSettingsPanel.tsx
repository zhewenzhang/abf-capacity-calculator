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
import React, { useEffect, useMemo, useState } from 'react';
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
import { useI18n } from '../../i18n';
import type { Workspace, WorkspaceRole } from '../../types';

const { Text } = Typography;

const WorkspaceSettingsPanel: React.FC = () => {
  const {
    user, scope, workspaces,
    addMember, removeMember, updateMemberRole, getWorkspaceDetail,
    createFromPersonal, reloadWorkspaces,
  } = useWorkspace();
  const { t } = useI18n();

  const roleOptions = useMemo<{ value: WorkspaceRole; label: string }[]>(() => [
    { value: 'editor', label: t('workspace.roleEditor') },
    { value: 'viewer', label: t('workspace.roleViewer') },
  ], [t]);

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
      messageApi.success(t('workspace.copyUidSuccessShort'));
    } catch {
      messageApi.error(t('workspace.copyUidFailShort', { uid: user.uid }));
    }
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      messageApi.warning(t('workspace.createNameRequired'));
      return;
    }
    setCreating(true);
    try {
      await createFromPersonal(name);
      messageApi.success(t('workspace.createSuccess', { name }));
      setCreateOpen(false);
      setCreateName('');
    } catch (err: any) {
      messageApi.error(err?.message || t('workspace.createFail'));
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
      messageApi.success(t('workspace.addSuccess', { uidShort: uid.slice(0, 8), role }));
      inviteForm.resetFields(['uid']);
      await refreshWorkspace();
    } catch (err: any) {
      messageApi.error(err?.message || t('workspace.addFail'));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberUid: string, role: WorkspaceRole) => {
    if (!scope.workspaceId) return;
    try {
      await updateMemberRole(scope.workspaceId, memberUid, role);
      messageApi.success(t('workspace.roleUpdated'));
      await refreshWorkspace();
    } catch (err: any) {
      messageApi.error(err?.message || t('workspace.roleUpdateFail'));
    }
  };

  const handleRemove = async (memberUid: string) => {
    if (!scope.workspaceId) return;
    try {
      await removeMember(scope.workspaceId, memberUid);
      messageApi.success(t('workspace.memberRemoved'));
      await refreshWorkspace();
    } catch (err: any) {
      messageApi.error(err?.message || t('workspace.memberRemoveFail'));
    }
  };

  const memberRows = workspace
    ? Object.entries(workspace.members).map(([uid, role]) => ({ uid, role }))
    : [];

  return (
    <Card
      title={<Space><TeamOutlined /><span>{t('workspace.settingsTitle')}</span></Space>}
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Tag color={scope.mode === 'workspace' ? 'blue' : 'default'}>
          {scope.mode === 'workspace' ? t('workspace.sharedTag') : t('workspace.personalTag')}
        </Tag>
      }
    >
      {contextHolder}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message={t('workspace.inviteAlertTitle')}
          description={
            <Space direction="vertical" size={4}>
              <Text>{t('workspace.inviteStepIntro')}</Text>
              <Text>{t('workspace.inviteStep1')}</Text>
              <Text>{t('workspace.inviteStep2')}</Text>
              <Text>{t('workspace.inviteStep3')}</Text>
              <Text>{t('workspace.inviteStep4')}</Text>
              <Text type="secondary">{t('workspace.inviteEmailNote')}</Text>
            </Space>
          }
        />

        <Space wrap>
          <Text type="secondary">{t('workspace.yourUid')}</Text>
          <Text code>{user.uid}</Text>
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopyUid}>{t('workspace.copyShort')}</Button>
          <Text type="secondary">{t('workspace.shareNote')}</Text>
        </Space>

        {scope.mode === 'personal' && (
          <>
            <Alert
              type="info"
              showIcon
              message={t('workspace.personalAlertTitle')}
              description={
                workspaces.length === 0
                  ? t('workspace.personalAlertNoShared')
                  : t('workspace.personalAlertWithShared', { count: workspaces.length })
              }
            />
            <Space>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setCreateOpen(true)}
              >
                {t('workspace.createCta')}
              </Button>
            </Space>
          </>
        )}

        {scope.mode === 'workspace' && (
          <>
            {loadingWs ? (
              <Text type="secondary">{t('workspace.loadingDetail')}</Text>
            ) : workspace ? (
              <>
                <Space wrap>
                  <Text strong>{t('workspace.workspaceLabel')}</Text>
                  <Text>{workspace.name}</Text>
                  <Tag color={scope.role === 'owner' ? 'gold' : scope.role === 'editor' ? 'blue' : 'default'}>
                    {t('workspace.yourRole', { role: scope.role })}
                  </Tag>
                  <Text type="secondary">{t('workspace.ownerUid', { uid: workspace.ownerId })}</Text>
                </Space>

                <Table
                  size="small"
                  rowKey="uid"
                  pagination={false}
                  dataSource={memberRows}
                  columns={[
                    {
                      title: t('workspace.memberUid'), dataIndex: 'uid', key: 'uid',
                      render: (uid: string) => (
                        <Space>
                          <Text code style={{ fontSize: 12 }}>{uid}</Text>
                          {uid === user.uid && <Tag color="green">{t('workspace.youTag')}</Tag>}
                          {uid === workspace.ownerId && <Tag color="gold">{t('workspace.ownerTag')}</Tag>}
                        </Space>
                      ),
                    },
                    {
                      title: t('workspace.roleColumn'), dataIndex: 'role', key: 'role',
                      width: 180,
                      render: (role: WorkspaceRole, record: { uid: string }) => {
                        if (record.uid === workspace.ownerId) {
                          return <Tag color="gold">{t('workspace.ownerTag')}</Tag>;
                        }
                        if (!isOwner) {
                          return <Tag>{role}</Tag>;
                        }
                        return (
                          <Select
                            size="small"
                            value={role}
                            style={{ width: 160 }}
                            options={roleOptions}
                            onChange={(value) => handleRoleChange(record.uid, value)}
                          />
                        );
                      },
                    },
                    {
                      title: t('common.actions'), key: 'actions', width: 120,
                      render: (_: unknown, record: { uid: string }) => {
                        if (!isOwner || record.uid === workspace.ownerId) return null;
                        return (
                          <Popconfirm
                            title={t('workspace.removeConfirm', { uidShort: record.uid.slice(0, 8) })}
                            onConfirm={() => handleRemove(record.uid)}
                          >
                            <Button size="small" danger>{t('workspace.removeAction')}</Button>
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
                          <Text strong>{t('workspace.inviteByUid')}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('workspace.inviteByUidNote')}
                          </Text>
                        </Space>
                      }
                      rules={[
                        { required: true, message: t('workspace.inviteRequired') },
                        {
                          validator: (_, value: string) => {
                            if (!value) return Promise.resolve();
                            if (value.includes('@')) {
                              return Promise.reject(new Error(t('workspace.inviteEmailError')));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        style={{ maxWidth: 480 }}
                        placeholder={t('workspace.invitePlaceholder')}
                      />
                    </Form.Item>
                    <Space>
                      <Form.Item name="role" label={t('workspace.roleLabel')} style={{ marginBottom: 0 }}>
                        <Select style={{ width: 200 }} options={roleOptions} />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0, alignSelf: 'flex-end' }}>
                        <Button type="primary" htmlType="submit" icon={<UserAddOutlined />} loading={inviting}>
                          {t('workspace.addMember')}
                        </Button>
                      </Form.Item>
                    </Space>
                  </Form>
                )}

                {!isOwner && (
                  <Alert type="info" showIcon message={t('workspace.ownerOnly')} />
                )}
              </>
            ) : (
              <Alert type="warning" showIcon message={t('workspace.loadFail')} />
            )}
          </>
        )}
      </Space>

      <Modal
        title={t('workspace.createModalTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText={t('workspace.createOkText')}
        cancelText={t('common.cancel')}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>{t('workspace.createDescription')}</Text>
          <Input
            placeholder={t('workspace.createPlaceholder')}
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
