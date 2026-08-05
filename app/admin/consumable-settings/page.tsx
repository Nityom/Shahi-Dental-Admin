'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAllConsumables,
  addConsumable,
  updateConsumable,
  deleteConsumable,
  Consumable
} from '@/services/consumables';
import { getAllInventory, Inventory } from '@/services/inventory';
import { Trash2, Edit, Plus, Save, X, Search, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useIsAdmin } from '@/hooks/use-is-admin';

/**
 * Consumable Items Settings Page
 * 
 * This page allows you to manage consumable items that are automatically
 * deducted from inventory when creating new prescriptions.
 */
const ConsumableSettingsPage = () => {
  const [items, setItems] = useState<Consumable[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const { isAdmin } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Consumable>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConsumables();
    loadInventory();
  }, []);

  const loadConsumables = async () => {
    try {
      setLoading(true);
      const data = await getAllConsumables();
      setItems(data);
    } catch (error) {
      console.error('Failed to load consumables:', error);
      alert('Failed to load consumable items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const data = await getAllInventory();
      setInventory(data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  const getInventoryStock = (itemName: string, itemId?: string): { stock: number | null, status: 'good' | 'low' | 'out' | 'not-found', matchedName?: string } => {
    // Search all inventory items (including the item itself) for stock
    const searchItems = inventory;

    // Try exact match first
    let inventoryItem = searchItems.find(inv =>
      inv.name.toLowerCase() === itemName.toLowerCase()
    );

    // If no exact match, try partial match
    if (!inventoryItem) {
      inventoryItem = searchItems.find(inv =>
        inv.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(inv.name.toLowerCase())
      );
    }

    // Try matching individual words
    if (!inventoryItem) {
      const itemWords = itemName.toLowerCase().split(/\s+/);
      inventoryItem = searchItems.find(inv => {
        const invWords = inv.name.toLowerCase().split(/\s+/);
        return itemWords.some(word => invWords.includes(word) && word.length > 3);
      });
    }

    if (!inventoryItem) {
      return { stock: null, status: 'not-found' };
    }

    const stock = inventoryItem.quantity;

    if (stock === 0) {
      return { stock, status: 'out', matchedName: inventoryItem.name };
    } else if (stock < 10) {
      return { stock, status: 'low', matchedName: inventoryItem.name };
    } else {
      return { stock, status: 'good', matchedName: inventoryItem.name };
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lowStockCount = items.filter(item => {
    const { status } = getInventoryStock(item.name, item.id);
    return status === 'low' || status === 'out';
  }).length;

  const handleEdit = (item: Consumable) => {
    setEditingId(item.id!);
    setEditForm({
      name: item.name,
      deduction_qty: item.deduction_qty ?? item.quantity ?? 1,
      description: item.description,
      enabled: item.enabled !== false
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id: string) => {
    try {
      if (!editForm.name || !editForm.deduction_qty || editForm.deduction_qty < 1) {
        alert('Please provide valid name and quantity (minimum 1)');
        return;
      }

      await updateConsumable(id, editForm);
      await loadConsumables();
      await loadInventory(); // Refresh inventory to get updated stock
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update consumable:', error);
      alert('Failed to update consumable item. Please try again.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await deleteConsumable(id);
      await loadConsumables();
      alert('Consumable item deleted successfully!');
    } catch (error) {
      console.error('Failed to delete consumable:', error);
      alert('Failed to delete consumable item. Please try again.');
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditForm({
      name: '',
      deduction_qty: 1,
      description: '',
      enabled: true
    });
  };

  const handleSaveNew = async () => {
    try {
      if (!editForm.name || !editForm.deduction_qty || editForm.deduction_qty < 1) {
        alert('Please provide valid name and quantity (minimum 1)');
        return;
      }

      await addConsumable({
        name: editForm.name,
        quantity: 0,
        deduction_qty: editForm.deduction_qty,
        description: editForm.description || '',
        enabled: editForm.enabled !== false
      });
      await loadConsumables();
      setIsAddingNew(false);
      setEditForm({});
      alert('Consumable item added successfully!');
    } catch (error) {
      console.error('Failed to add consumable:', error);
      alert('Failed to add consumable item. Please try again.');
    }
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setEditForm({});
  };

  const handleToggleEnabled = async (item: Consumable) => {
    try {
      await updateConsumable(item.id!, { enabled: !item.enabled });
      await loadConsumables();
    } catch (error) {
      console.error('Failed to toggle consumable:', error);
      alert('Failed to update consumable status. Please try again.');
    }
  };

  return (
    <div className="w-full min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Consumable Items Settings</h1>
        <p className="text-gray-600">
          Manage items automatically deducted from inventory when creating new prescriptions
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Loading consumable items...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Search and Add Button Row */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search consumable items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Add New Button */}
            <Button
              onClick={handleAddNew}
              disabled={isAddingNew}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Item
            </Button>
          </div>

          {/* Low Stock Alert */}
          {lowStockCount > 0 && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">
                    {lowStockCount} item{lowStockCount > 1 ? 's' : ''} with low or out of stock in inventory!
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consumable Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Consumable Items</CardTitle>
              <CardDescription>
                Click Edit to modify items, toggle status to enable/disable. Inventory stock shown for reference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 && !isAddingNew ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? `No items found matching "${searchTerm}"` : 'No consumable items found. Click "Add New Item" to get started.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold">Item Name</th>
                        <th className="text-center p-3 font-semibold">Qty/Patient</th>
                        <th className="text-center p-3 font-semibold">Inventory Stock</th>
                        <th className="text-left p-3 font-semibold">Description</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                        <th className="text-center p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Add New Row */}
                      {isAddingNew && (
                        <tr className="border-b bg-blue-50">
                          <td className="p-3">
                            <Input
                              placeholder="Item name"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={editForm.deduction_qty || 1}
                              onChange={(e) => setEditForm({ ...editForm, deduction_qty: parseInt(e.target.value) || 1 })}
                              className="w-20 mx-auto"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-gray-400 text-sm">N/A</span>
                          </td>
                          <td className="p-3">
                            <Input
                              placeholder="Description (optional)"
                              value={editForm.description || ''}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              Enabled
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={handleSaveNew}
                                className="flex items-center gap-1"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelNew}
                                className="flex items-center gap-1"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Existing Items */}
                      {filteredItems.map((item) => {
                        const inventoryInfo = getInventoryStock(item.name, item.id);
                        return (
                          <tr key={item.id} className={`border-b hover:bg-gray-50 ${editingId === item.id ? 'bg-yellow-50' : ''}`}>
                            <td className="p-3">
                              {editingId === item.id ? (
                                <Input
                                  value={editForm.name || ''}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                              ) : (
                                <span className="font-medium">{item.name}</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {editingId === item.id ? (
                                <Input
                                  type="number"
                                  min="1"
                                  value={editForm.deduction_qty || 1}
                                  onChange={(e) => setEditForm({ ...editForm, deduction_qty: parseInt(e.target.value) || 1 })}
                                  className="w-20 mx-auto"
                                />
                              ) : (
                                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                                  {item.deduction_qty ?? item.quantity ?? 1}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {inventoryInfo.stock !== null ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <div className="flex items-center gap-2">
                                    {inventoryInfo.status === 'good' && (
                                      <>
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="font-semibold text-green-700">{inventoryInfo.stock}</span>
                                      </>
                                    )}
                                    {inventoryInfo.status === 'low' && (
                                      <>
                                        <AlertCircle className="w-4 h-4 text-orange-600" />
                                        <span className="font-semibold text-orange-700">{inventoryInfo.stock}</span>
                                      </>
                                    )}
                                    {inventoryInfo.status === 'out' && (
                                      <>
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                        <span className="font-semibold text-red-700">{inventoryInfo.stock}</span>
                                      </>
                                    )}
                                  </div>
                                  {inventoryInfo.matchedName && inventoryInfo.matchedName !== item.name && (
                                    <span className="text-xs text-gray-500" title={`Matched with: ${inventoryInfo.matchedName}`}>
                                      ({inventoryInfo.matchedName})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-gray-400 text-sm flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    Not found
                                  </span>
                                  <button
                                    onClick={() => {
                                      const msg = `Inventory items available:\n\n${inventory.map(inv => `• ${inv.name} (Stock: ${inv.quantity})`).join('\n')}\n\nTip: Edit the consumable item name to match one of these inventory items.`;
                                      alert(msg);
                                    }}
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    View inventory
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {editingId === item.id ? (
                                <Input
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  placeholder="Description (optional)"
                                />
                              ) : (
                                <span className="text-gray-600">{item.description || '-'}</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {editingId === item.id ? (
                                <label className="flex items-center justify-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editForm.enabled !== false}
                                    onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">{editForm.enabled !== false ? 'Enabled' : 'Disabled'}</span>
                                </label>
                              ) : (
                                <button
                                  onClick={() => handleToggleEnabled(item)}
                                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold cursor-pointer ${item.enabled !== false
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    }`}
                                >
                                  {item.enabled !== false ? 'Enabled' : 'Disabled'}
                                </button>
                              )}
                            </td>
                            <td className="p-3">
                              {editingId === item.id ? (
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(item.id!)}
                                    className="flex items-center gap-1"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="flex items-center gap-1"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(item)}
                                    className="flex items-center gap-1"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </Button>
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDelete(item.id!, item.name)}
                                      className="flex items-center gap-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Setup Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Setup & Important Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-sm text-red-800 mb-2">
                  <strong>⚠️ Items Not Found in Inventory?</strong>
                </p>
                <p className="text-sm text-red-700 mb-2">
                  If items show "Not found", you need to add them to your inventory first:
                </p>
                <ol className="text-sm text-red-700 list-decimal ml-5 space-y-1">
                  <li>Go to <strong>Inventory Management</strong> page</li>
                  <li>Add each consumable item (use the exact name from this page)</li>
                  <li>Set initial stock quantity and rate</li>
                  <li>Come back here and reload the page</li>
                </ol>
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() => window.open('/admin/inventory', '_blank')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Go to Inventory Management
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>📝 Current Inventory Items:</strong>
                </p>
                {inventory.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="text-sm text-blue-700 space-y-1">
                      {inventory.slice(0, 20).map((inv, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>• {inv.name}</span>
                          <span className="font-semibold">Stock: {inv.quantity}</span>
                        </li>
                      ))}
                      {inventory.length > 20 && (
                        <li className="text-xs italic">...and {inventory.length - 20} more items</li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700">No inventory items found. Please add items to inventory first.</p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm text-green-800">
                  <strong>✅ Auto-Deduction:</strong> When a new prescription is created, all enabled consumable items will be automatically deducted from your inventory.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-purple-700">{items.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-1">Enabled Items</p>
                  <p className="text-2xl font-bold text-green-700">
                    {items.filter(item => item.enabled !== false).length}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                  <p className="text-2xl font-bold text-orange-700">{lowStockCount}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-1">Units Per Patient</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {items.filter(item => item.enabled !== false).reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('/admin/inventory', '_blank')}
              >
                📦 Manage Inventory
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('/admin/prescription', '_blank')}
              >
                📋 Create Prescription
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ConsumableSettingsPage;
