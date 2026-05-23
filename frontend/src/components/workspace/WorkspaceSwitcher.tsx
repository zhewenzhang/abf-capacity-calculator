/**
 * WorkspaceSwitcher — header dropdown for picking Personal vs Shared workspaces,
 * plus a "Copy my UID" affordance (the MVP invite handshake).
 */
import React, { useState } from 'react';
import { Button, Dropdown, message, Space, Tag, Tooltip } from 'antd';
import { TeamOutlined, UserOutlined, CopyOutlined, DownOutlined } from '@ant-design/icons';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { MenuProps } from 'antd';

export const WorkspaceSwitcher: React.FC = () => {
  const { scope, workspaces, switchToPersonal, switchToWorkspace, loading, user } = useWorkspace();
  const [messageApi, contextHolder] = message.useMessage();
  const [copying, setCopying] = useState(false);

  const currentLabel = scope.mode === 'personal'
    ? 'Personal'
    : (workspaces.find((w) => w.workspaceId === scope.workspaceId)?.workspaceName ?? 'Workspace');

  const roleTag = scope.mode === 'workspace' ? (
    <Tag color={scope.role === 'owner' ? 'gold' : scope.role === 'editor' ? 'blue' : 'default'}>
      {scope.role}
    </Tag>
  ) : (
    <Tag color="default">personal</Tag>
  );

  const handleCopyUid = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(user.uid);
      messageApi.success('Your Google UID was copied. Share it with the workspace owner who is inviting you.');
    } catch {
      messageApi.error('Copy failed. Your UID is shown in Parameters → Workspace Settings.');
    } finally {
      setCopying(false);
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'personal',
      icon: <UserOutlined />,
      label: 'Personal Workspace',
      onClick: () => switchToPersonal(),
    },
    ...(workspaces.length > 0
      ? [{ type: 'divider' as const }]
      : []),
    ...workspaces.map((w) => ({
      key: `ws-${w.workspaceId}`,
      icon: <TeamOutlined />,
      label: (
        <Space>
          <span>{w.workspaceName}</span>
          <Tag color={w.role === 'owner' ? 'gold' : w.role === 'editor' ? 'blue' : 'default'}>{w.role}</Tag>
        </Space>
      ),
      onClick: () => switchToWorkspace(w.workspaceId),
    })),
  ];

  return (
    <>
      {contextHolder}
      <Space size={4}>
        <Dropdown menu={{ items }} disabled={loading} placement="bottomRight">
          <Button size="small" icon={scope.mode === 'workspace' ? <TeamOutlined /> : <UserOutlined />}>
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}>
              {currentLabel}
            </span>
            <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
          </Button>
        </Dropdown>
        {roleTag}
        <Tooltip title="Copy your Google UID — give this to a workspace owner so they can invite you.">
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopyUid} loading={copying}>
            UID
          </Button>
        </Tooltip>
      </Space>
    </>
  );
};

export default WorkspaceSwitcher;
