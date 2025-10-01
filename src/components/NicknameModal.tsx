'use client';

import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';

// Modalのルート要素を設定 (クライアントサイドでのみ実行)
if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

interface NicknameModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onConfirm: (nickname: string) => void;
}

export default function NicknameModal({ isOpen, onRequestClose, onConfirm }: NicknameModalProps) {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onConfirm(nickname.trim());
    }
  };
  
  // モーダルが開いたときにニックネームを復元
  useEffect(() => {
    if (isOpen) {
      const savedNickname = localStorage.getItem('nickname') || '';
      setNickname(savedNickname);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Enter Nickname"
      className="bg-gray-800 rounded-lg p-8 max-w-sm mx-auto mt-20 shadow-xl border border-gray-700"
      overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center"
    >
      <h2 className="text-2xl font-bold mb-4 text-white">ニックネームを入力</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="ニックネーム"
          className="w-full px-4 py-2 mb-4 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          maxLength={15}
        />
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onRequestClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={!nickname.trim()}
          >
            入室する
          </button>
        </div>
      </form>
    </Modal>
  );
}