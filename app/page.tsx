"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Trash2,
  Copy,
  Edit,
  Download,
  Upload,
  RefreshCw,
  History,
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardPaste,
  Check,
  Plus,
  Search,
  X,
  AlertTriangle,
  Settings,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { gameItems, type GameItem, itemCategories } from "@/lib/item-ids"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Types
interface ItemProperty {
  itemID: string
  colorHue?: number
  colorSaturation?: number
  scaleModifier?: number
  ammo?: number
  state?: number
  children?: ItemProperty[]
}

interface EquipmentLoadout {
  version: number
  back?: ItemProperty
  leftHand?: ItemProperty
  rightHand?: ItemProperty
  leftHip?: ItemProperty
  rightHip?: ItemProperty
}

type BypassSlotType = "leftHand" | "rightHand" | "back" | "leftHip" | "rightHip"

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loadout, setLoadout] = useState<EquipmentLoadout>({ version: 1 })
  const [outputJson, setOutputJson] = useState("")
  const [savedLoadouts, setSavedLoadouts] = useState<{ name: string; data: EquipmentLoadout }[]>([])
  const [editingItem, setEditingItem] = useState<{ path: string; item: ItemProperty } | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [updateLog, setUpdateLog] = useState<string[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [isUpdateLogOpen, setIsUpdateLogOpen] = useState(false)
  const [copiedItem, setCopiedItem] = useState<ItemProperty | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [copiedItems, setCopiedItems] = useState<ItemProperty[]>([])

  // New state for item selection
  const [itemSelectionTarget, setItemSelectionTarget] = useState<{
    type: "slot" | "container"
    target: string
  } | null>(null)

  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false)

  // New state for bypass preset dialog
  const [isBypassDialogOpen, setIsBypassDialogOpen] = useState(false)
  const [bypassSlot, setBypassSlot] = useState<BypassSlotType>("leftHand")
  const [bypassItemsSearch, setBypassItemsSearch] = useState("")
  const [bypassSelectedItems, setBypassSelectedItems] = useState<string[]>([])
  const [bypassSelectedCategory, setBypassSelectedCategory] = useState<string>("all")

  // Add these new state variables after the other bypass-related state
  const [bypassRandomizeItems, setBypassRandomizeItems] = useState<boolean>(false)
  const [bypassItemQuantities, setBypassItemQuantities] = useState<Record<string, number>>({})
  const [bypassShowContainers, setBypassShowContainers] = useState<boolean>(false)

  // Check if an item is a container (can hold other items)
  const isContainer = (itemID: string) => {
    return (
      itemID.includes("backpack") ||
      itemID.includes("heart_gun") ||
      itemID.includes("shredder") ||
      itemID.includes("quiver")
    )
  }

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("animalCompanyLoadouts")
    if (savedData) {
      try {
        setSavedLoadouts(JSON.parse(savedData))
      } catch (e) {
        console.error("Failed to parse saved loadouts", e)
      }
    }

    const currentLoadout = localStorage.getItem("currentLoadout")
    if (currentLoadout) {
      try {
        setLoadout(JSON.parse(currentLoadout))
      } catch (e) {
        console.error("Failed to parse current loadout", e)
      }
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("animalCompanyLoadouts", JSON.stringify(savedLoadouts))
  }, [savedLoadouts])

  useEffect(() => {
    localStorage.setItem("currentLoadout", JSON.stringify(loadout))
    generateOutput()
  }, [loadout])

  // Filter items based on search term and category
  const filteredItems = gameItems
    .filter((item) => {
      // Filter by search term
      const matchesSearch = searchTerm
        ? item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true

      // Filter by category
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory


      return matchesSearch && matchesCategory &&  || searchTerm)
    })
    .sort((a, b) => {
      // Sort backpacks to the top
      const aIsBackpack = a.id.includes("backpack")
      const bIsBackpack = b.id.includes("backpack")

      if (aIsBackpack && !bIsBackpack) return -1
      if (!aIsBackpack && bIsBackpack) return 1

      // Then sort heart guns to the top
      const aIsHeartGun = a.id.includes("heart_gun")
      const bIsHeartGun = b.id.includes("heart_gun")

      if (aIsHeartGun && !bIsHeartGun) return -1
      if (!aIsHeartGun && bIsHeartGun) return 1

      // Then sort other containers to the top
      const aIsContainer = isContainer(a.id)
      const bIsContainer = isContainer(b.id)

      if (aIsContainer && !bIsContainer) return -1
      if (!aIsContainer && bIsContainer) return 1

      // Finally sort alphabetically by name
      return a.name.localeCompare(b.name)
    })

  // Replace the filteredBypassItems definition with this updated version that allows containers
  const filteredBypassItems = gameItems
    .filter((item) => {
      // Filter by search term
      const matchesSearch = bypassItemsSearch
        ? item.id.toLowerCase().includes(bypassItemsSearch.toLowerCase()) ||
          item.name.toLowerCase().includes(bypassItemsSearch.toLowerCase())
        : true

      // Filter by category
      const matchesCategory = bypassSelectedCategory === "all" || item.category === bypassSelectedCategory

      // Only filter out containers if the toggle is off
      const showItem = bypassShowContainers ? true : !isContainer(item.id)

      return matchesSearch && matchesCategory && showItem
    })
    .sort((a, b) => {
      // Sort containers to the top if showing containers
      if (bypassShowContainers) {
        const aIsContainer = isContainer(a.id)
        const bIsContainer = isContainer(b.id)

        if (aIsContainer && !bIsContainer) return -1
        if (!aIsContainer && bIsContainer) return 1
      }

      // Sort by category first
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      // Then by name
      return a.name.localeCompare(b.name)
    })

  // Generate JSON output
  const generateOutput = () => {
    const compact = JSON.stringify(loadout)
    const pretty = JSON.stringify(loadout, null, 2)
    setOutputJson(pretty)
  }

  // Open item selector for a slot
  const openItemSelectorForSlot = (slot: keyof EquipmentLoadout) => {
    setItemSelectionTarget({
      type: "slot",
      target: slot,
    })
    setIsItemSelectorOpen(true)
  }

  // Open item selector for a container
  const openItemSelectorForContainer = (path: string) => {
    setItemSelectionTarget({
      type: "container",
      target: path,
    })
    setIsItemSelectorOpen(true)
  }

  // Handle item selection
  const handleItemSelection = (itemID: string) => {
    if (!itemSelectionTarget) return

    if (itemSelectionTarget.type === "slot") {
      // Add to slot
      const slot = itemSelectionTarget.target as keyof EquipmentLoadout
      addItemToSlot(slot, itemID)
    } else {
      // Add to container
      addItemToContainer(itemSelectionTarget.target, itemID)
    }

    // Close the selector
    setIsItemSelectorOpen(false)
    setItemSelectionTarget(null)
  }

  // Add item to a slot (completely rewritten)
  const addItemToSlot = (slot: keyof EquipmentLoadout, itemID: string) => {
    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      // Add the item to the slot
      newLoadout[slot] = { itemID }

      return newLoadout
    })

    addToUpdateLog(`Added ${itemID} to ${slot}`)
  }

  // Add item to a container (completely rewritten)
  const addItemToContainer = (path: string, itemID: string) => {
    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      // Helper function to get a reference to an object at a specific path
      const getObjectAtPath = (obj: any, path: string) => {
        const parts = path.split(".")
        let current = obj

        for (const part of parts) {
          if (part.includes("[")) {
            // Handle array access
            const [arrayName, indexStr] = part.split("[")
            const index = Number.parseInt(indexStr.replace("]", ""), 10)
            current = current[arrayName][index]
          } else {
            // Handle object property access
            current = current[part]
          }
        }

        return current
      }

      // Get the container object
      const container = getObjectAtPath(newLoadout, path)

      // Ensure the container has a children array
      if (!container.children) {
        container.children = []
      }

      // Add the new item to the children array
      container.children.push({ itemID })

      return newLoadout
    })

    addToUpdateLog(`Added ${itemID} to container at ${path}`)
  }

  // Remove item from a slot or container
  const removeItem = (path: string) => {
    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      const parts = path.split(".")

      if (parts.length === 1) {
        // It's a top-level slot
        delete newLoadout[parts[0] as keyof EquipmentLoadout]
      } else {
        // It's a nested item

        // Get the parent object and the property to remove
        const parentPath = parts.slice(0, -1).join(".")
        const lastPart = parts[parts.length - 1]

        const getObjectAtPath = (obj: any, path: string) => {
          if (!path) return obj

          const parts = path.split(".")
          let current = obj

          for (const part of parts) {
            if (part.includes("[")) {
              // Handle array access
              const [arrayName, indexStr] = part.split("[")
              const index = Number.parseInt(indexStr.replace("]", ""), 10)
              current = current[arrayName][index]
            } else {
              // Handle object property access
              current = current[part]
            }
          }

          return current
        }

        const parent = getObjectAtPath(newLoadout, parentPath)

        if (lastPart.includes("[")) {
          // It's an array item
          const [arrayName, indexStr] = lastPart.split("[")
          const index = Number.parseInt(indexStr.replace("]", ""), 10)

          // Remove the item from the array
          parent[arrayName].splice(index, 1)

          // If the array is now empty, remove it
          if (arrayName === "children" && parent.children.length === 0) {
            delete parent.children
          }
        } else {
          // It's an object property
          delete parent[lastPart]
        }
      }

      return newLoadout
    })

    addToUpdateLog(`Removed item at ${path}`)
  }

  // Duplicate an item
  const duplicateItem = (path: string) => {
    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      const parts = path.split(".")

      // Helper function to get a reference to an object at a specific path
      const getObjectAtPath = (obj: any, path: string) => {
        if (!path) return obj

        const parts = path.split(".")
        let current = obj

        for (const part of parts) {
          if (part.includes("[")) {
            // Handle array access
            const [arrayName, indexStr] = part.split("[")
            const index = Number.parseInt(indexStr.replace("]", ""), 10)
            current = current[arrayName][index]
          } else {
            // Handle object property access
            current = current[part]
          }
        }

        return current
      }

      if (parts.length === 1) {
        // It's a top-level slot
        const slot = parts[0] as keyof EquipmentLoadout
        const itemToDuplicate = JSON.parse(JSON.stringify(newLoadout[slot]))
        // We can't duplicate a top-level slot directly, so we'll just log it
        addToUpdateLog(`Cannot duplicate top-level slot ${slot}`)
      } else {
        // It's a nested item

        // Get the parent path and the item to duplicate
        const parentPath = parts.slice(0, -1).join(".")
        const lastPart = parts[parts.length - 1]

        const parent = getObjectAtPath(newLoadout, parentPath)

        if (lastPart.includes("[")) {
          // It's an array item
          const [arrayName, indexStr] = lastPart.split("[")
          const index = Number.parseInt(indexStr.replace("]", ""), 10)

          // Get the item to duplicate
          const itemToDuplicate = JSON.parse(JSON.stringify(parent[arrayName][index]))

          // Add the duplicate to the array
          parent[arrayName].push(itemToDuplicate)
        }
      }

      return newLoadout
    })

    addToUpdateLog(`Duplicated item at ${path}`)
  }

  // Toggle item selection for multi-select
  const toggleItemSelection = (path: string) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(path)) {
        newSelection.delete(path)
      } else {
        newSelection.add(path)
      }
      return newSelection
    })
  }

  // Copy selected items
  const copySelectedItems = () => {
    const itemsToCopy: ItemProperty[] = []

    selectedItems.forEach((path) => {
      const getObjectAtPath = (obj: any, path: string) => {
        if (!path) return obj

        const parts = path.split(".")
        let current = obj

        for (const part of parts) {
          if (part.includes("[")) {
            // Handle array access
            const [arrayName, indexStr] = part.split("[")
            const index = Number.parseInt(indexStr.replace("]", ""), 10)
            current = current[arrayName][index]
          } else {
            // Handle object property access
            current = current[part]
          }
        }

        return current
      }

      const parts = path.split(".")

      if (parts.length === 1) {
        // It's a top-level slot
        const item = loadout[parts[0] as keyof EquipmentLoadout]
        if (item) {
          itemsToCopy.push(JSON.parse(JSON.stringify(item)))
        }
      } else {
        // It's a nested item
        const item = getObjectAtPath(loadout, path)
        if (item) {
          itemsToCopy.push(JSON.parse(JSON.stringify(item)))
        }
      }
    })

    setCopiedItems(itemsToCopy)
    addToUpdateLog(`Copied ${itemsToCopy.length} items`)

    // Exit multi-select mode after copying
    setIsMultiSelectMode(false)
    setSelectedItems(new Set())
  }

  // Paste selected items to a container
  const pasteSelectedItems = (path: string) => {
    if (copiedItems.length === 0) return

    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      // Helper function to get a reference to an object at a specific path
      const getObjectAtPath = (obj: any, path: string) => {
        if (!path) return obj

        const parts = path.split(".")
        let current = obj

        for (const part of parts) {
          if (part.includes("[")) {
            // Handle array access
            const [arrayName, indexStr] = part.split("[")
            const index = Number.parseInt(indexStr.replace("]", ""), 10)
            current = current[arrayName][index]
          } else {
            // Handle object property access
            current = current[part]
          }
        }

        return current
      }

      // Get the container
      const container = getObjectAtPath(newLoadout, path)

      // Ensure the container has a children array
      if (!container.children) {
        container.children = []
      }

      // Add each copied item to the container
      for (const item of copiedItems) {
        container.children.push(JSON.parse(JSON.stringify(item)))
      }

      return newLoadout
    })

    addToUpdateLog(`Pasted ${copiedItems.length} items to ${path}`)
  }

  // Copy an item to clipboard
  const copyItem = (path: string) => {
    const getObjectAtPath = (obj: any, path: string) => {
      if (!path) return obj

      const parts = path.split(".")
      let current = obj

      for (const part of parts) {
        if (part.includes("[")) {
          // Handle array access
          const [arrayName, indexStr] = part.split("[")
          const index = Number.parseInt(indexStr.replace("]", ""), 10)
          current = current[arrayName][index]
        } else {
          // Handle object property access
          current = current[part]
        }
      }

      return current
    }

    const parts = path.split(".")

    if (parts.length === 1) {
      // It's a top-level slot
      const item = loadout[parts[0] as keyof EquipmentLoadout]
      if (item) {
        setCopiedItem(JSON.parse(JSON.stringify(item)))
      }
    } else {
      // It's a nested item
      const item = getObjectAtPath(loadout, path)
      if (item) {
        setCopiedItem(JSON.parse(JSON.stringify(item)))
      }
    }

    addToUpdateLog(`Copied item at ${path}`)
  }

  // Paste an item to a slot
  const pasteItem = (slot: keyof EquipmentLoadout) => {
    if (!copiedItem) return

    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      // Add the copied item to the slot
      newLoadout[slot] = JSON.parse(JSON.stringify(copiedItem))

      return newLoadout
    })

    addToUpdateLog(`Pasted item to ${slot}`)
  }

  // Open edit dialog for an item
  const openEditDialog = (path: string, item: ItemProperty) => {
    setEditingItem({ path, item: { ...item } })
    setIsEditDialogOpen(true)
  }

  // Save edited item
  const saveEditedItem = () => {
    if (!editingItem) return

    const { path, item } = editingItem

    setLoadout((prev) => {
      // Create a deep copy to avoid reference issues
      const newLoadout = JSON.parse(JSON.stringify(prev))

      const parts = path.split(".")

      // Helper function to get a reference to an object at a specific path
      const getObjectAtPath = (obj: any, path: string) => {
        if (!path) return obj

        const parts = path.split(".")
        let current = obj

        for (const part of parts) {
          if (part.includes("[")) {
            // Handle array access
            const [arrayName, indexStr] = part.split("[")
            const index = Number.parseInt(indexStr.replace("]", ""), 10)
            current = current[arrayName][index]
          } else {
            // Handle object property access
            current = current[part]
          }
        }

        return current
      }

      if (parts.length === 1) {
        // It's a top-level slot
        newLoadout[parts[0] as keyof EquipmentLoadout] = JSON.parse(JSON.stringify(item))
      } else {
        // It's a nested item

        // Get the parent path and the property to update
        const parentPath = parts.slice(0, -1).join(".")
        const lastPart = parts[parts.length - 1]

        const parent = getObjectAtPath(newLoadout, parentPath)

        if (lastPart.includes("[")) {
          // It's an array item
          const [arrayName, indexStr] = lastPart.split("[")
          const index = Number.parseInt(indexStr.replace("]", ""), 10)

          // Update the item
          parent[arrayName][index] = JSON.parse(JSON.stringify(item))
        } else {
          // It's an object property
          parent[lastPart] = JSON.parse(JSON.stringify(item))
        }
      }

      return newLoadout
    })

    setIsEditDialogOpen(false)
    setEditingItem(null)
    addToUpdateLog(`Edited item at ${path}`)
  }

  // Reset loadout
  const resetLoadout = () => {
    setLoadout({ version: 1 })
    addToUpdateLog("Reset loadout")
  }

  // Upload JSON
  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        setLoadout(json)
        addToUpdateLog("Uploaded JSON file")
      } catch (error) {
        console.error("Error parsing JSON file:", error)
        addToUpdateLog("Error parsing JSON file")
      }
    }
    reader.readAsText(file)
  }

  // Download JSON
  const downloadJson = (compact = false) => {
    const jsonStr = compact ? JSON.stringify(loadout) : JSON.stringify(loadout, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "animal-company-loadout.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToUpdateLog(`Downloaded ${compact ? "compact" : "formatted"} JSON`)
  }

  // Randomize all items' colors and sizes
  const randomizeAll = () => {
    const randomizeItem = (item: ItemProperty): ItemProperty => {
      const newItem = { ...item }

      // Randomize color
      newItem.colorHue = Math.floor(Math.random() * 210)
      newItem.colorSaturation = Math.floor(Math.random() * 120)

      // Randomize size
      newItem.scaleModifier = Math.floor(Math.random() * 255) - 128

      // Randomize children recursively
      if (newItem.children && newItem.children.length > 0) {
        newItem.children = newItem.children.map((child) => randomizeItem(child))
      }

      return newItem
    }

    setLoadout((prev) => {
      const newLoadout = { ...prev }

      // Randomize each slot
      for (const slot of ["back", "leftHand", "rightHand", "leftHip", "rightHip"] as const) {
        if (newLoadout[slot]) {
          newLoadout[slot] = randomizeItem(newLoadout[slot]!)
        }
      }

      return newLoadout
    })

    addToUpdateLog("Randomized all items' colors and sizes")
  }

  // Add to update log
  const addToUpdateLog = (message: string) => {
    setUpdateLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Toggle expanded state for container items
  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  // Get container capacity
  const getContainerCapacity = (itemID: string) => {
    if (itemID.includes("backpack")) {
      if (itemID.includes("large")) return 23
      if (itemID.includes("small")) return 5
      return 10 // Regular backpack
    }
    if (itemID.includes("quiver")) return 10
    if (itemID.includes("shredder")) return 5
    return 5 // Default for other containers like heart guns
  }

  // Get item details from ID
  const getItemDetails = (itemID: string): GameItem | undefined => {
    return gameItems.find((item) => item.id === itemID)
  }

  // Replace the toggleBypassItemSelection function with this updated version
  const toggleBypassItemSelection = (itemID: string) => {
    setBypassSelectedItems((prev) => {
      if (prev.includes(itemID)) {
        return prev.filter((id) => id !== itemID)
      } else {
        return [...prev, itemID]
      }
    })

    // Initialize quantity to 1 if not already set
    if (!bypassItemQuantities[itemID]) {
      setBypassItemQuantities((prev) => ({
        ...prev,
        [itemID]: 1,
      }))
    }
  }

  // Add this function to update item quantities
  const updateBypassItemQuantity = (itemID: string, quantity: number) => {
    if (quantity < 1) quantity = 1
    if (quantity > 100) quantity = 100

    setBypassItemQuantities((prev) => ({
      ...prev,
      [itemID]: quantity,
    }))
  }

  // Replace the createBypassStructure function with this updated version
  const createBypassStructure = () => {
    if (bypassSelectedItems.length === 0) {
      addToUpdateLog("No items selected for bypass")
      return { version: 1 }
    }

    // Create a new loadout
    const newLoadout: EquipmentLoadout = { version: 1 }

    // Expand items based on quantities
    const expandedItems: string[] = []
    bypassSelectedItems.forEach((itemID) => {
      const quantity = bypassItemQuantities[itemID] || 1
      for (let i = 0; i < quantity; i++) {
        expandedItems.push(itemID)
      }
    })

    // Function to randomize an item's properties
    const randomizeItem = (item: ItemProperty): ItemProperty => {
      if (!bypassRandomizeItems) return item

      const newItem = { ...item }

      // Randomize color
      newItem.colorHue = Math.floor(Math.random() * 210)
      newItem.colorSaturation = Math.floor(Math.random() * 120)

      // Randomize size
      newItem.scaleModifier = Math.floor(Math.random() * 255) - 128

      return newItem
    }

    // Function to create a nested structure of containers
    const createNestedContainers = (items: string[]): ItemProperty => {
      // Start with a heart gun
      const heartGun: ItemProperty = {
        itemID: "item_heart_gun",
        children: [],
      }

      // Create a large backpack inside the heart gun
      const largeBackpack: ItemProperty = {
        itemID: "item_backpack_large_base",
        children: [],
      }

      // Add the backpack to the heart gun
      heartGun.children = [largeBackpack]

      // Group items into chunks of 22 (large backpack capacity)
      const chunks: string[][] = []
      for (let i = 0; i < items.length; i += 22) {
        chunks.push(items.slice(i, i + 22))
      }

      // If we only have one chunk that fits in a backpack, just add the items
      if (chunks.length === 1) {
        largeBackpack.children = chunks[0].map((itemID) => randomizeItem({ itemID }))
        return heartGun
      }

      // Otherwise, we need to create a nested structure
      // First chunk goes directly in the backpack
      largeBackpack.children = chunks[0].map((itemID) => randomizeItem({ itemID }))

      // For remaining chunks, create heart guns with backpacks
      let currentContainer = largeBackpack
      for (let i = 1; i < chunks.length; i++) {
        // Create a heart gun
        const nestedHeartGun: ItemProperty = {
          itemID: "item_heart_gun",
          children: [],
        }

        // Add the heart gun to the current container
        if (!currentContainer.children) {
          currentContainer.children = []
        }
        currentContainer.children.push(nestedHeartGun)

        // Create a backpack inside the heart gun
        const nestedBackpack: ItemProperty = {
          itemID: "item_backpack_large_base",
          children: chunks[i].map((itemID) => randomizeItem({ itemID })),
        }

        // Add the backpack to the heart gun
        nestedHeartGun.children = [nestedBackpack]

        // Update the current container for the next iteration
        currentContainer = nestedBackpack
      }

      return heartGun
    }

    // Create the bypass structure
    const bypassStructure = createNestedContainers(expandedItems)

    // Add to the selected slot
    newLoadout[bypassSlot] = bypassStructure

    return newLoadout
  }

  // Update the handleBypassPresetConfirm function
  const handleBypassPresetConfirm = () => {
    const bypassLoadout = createBypassStructure()
    setLoadout(bypassLoadout)

    // Calculate total items including quantities
    const totalItems = bypassSelectedItems.reduce((total, itemID) => {
      return total + (bypassItemQuantities[itemID] || 1)
    }, 0)

    const containerCount = Math.ceil(totalItems / 22)

    addToUpdateLog(`Created bypass structure with ${totalItems} items in ${containerCount} containers`)
    setIsBypassDialogOpen(false)
    setBypassSelectedItems([])
    setBypassItemQuantities({})
  }

  // Render an item with its properties and children
  const renderItem = (item: ItemProperty, path: string) => {
    const isExpanded = expandedPaths.has(path)
    const isItemContainer = isContainer(item.itemID)
    const containerCapacity = isItemContainer ? getContainerCapacity(item.itemID) : 0
    const childrenCount = item.children?.length || 0
    const itemDetails = getItemDetails(item.itemID)
    const isSelected = selectedItems.has(path)

    return (
      <div
        className={`border ${isSelected ? "border-[#b794f4]" : "border-[#2a3a5a]"} rounded-md p-2 mb-2 bg-[#0a101f]`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMultiSelectMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleItemSelection(path)}
                className="mr-1 data-[state=checked]:bg-[#b794f4] data-[state=checked]:text-white"
              />
            )}
            {isItemContainer && (
              <button onClick={() => toggleExpanded(path)} className="text-[#8a9cc2] hover:text-[#c3d0e9]">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <span className="text-[#c3d0e9]">{itemDetails?.name || item.itemID}</span>
            {isItemContainer && (
              <Badge variant="outline" className="ml-2 text-xs bg-[#1a2a40] text-[#8a9cc2] border-[#2a3a5a]">
                {childrenCount}/{containerCapacity}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isMultiSelectMode && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#8a9cc2] hover:text-[#c3d0e9] hover:bg-[#1a2a40]"
                  onClick={() => copyItem(path)}
                  title="Copy item"
                >
                  <Clipboard size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#8a9cc2] hover:text-[#c3d0e9] hover:bg-[#1a2a40]"
                  onClick={() => openEditDialog(path, item)}
                  title="Edit item"
                >
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#8a9cc2] hover:text-[#c3d0e9] hover:bg-[#1a2a40]"
                  onClick={() => duplicateItem(path)}
                  title="Duplicate item"
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#8a9cc2] hover:text-red-400 hover:bg-[#2a1a20]"
                  onClick={() => removeItem(path)}
                  title="Remove item"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        </div>

        {isItemContainer && isExpanded && (
          <div className="pl-4 mt-2 border-l border-[#2a3a5a]">
            {item.children && item.children.length > 0 ? (
              <div className="space-y-2">
                {item.children.map((child, index) => (
                  <div key={index}>{renderItem(child, `${path}.children[${index}]`)}</div>
                ))}
              </div>
            ) : (
              <div className="text-[#8a9cc2]/70 text-sm italic">Empty container</div>
            )}

            {childrenCount < containerCapacity && (
              <div className="mt-2">
                {copiedItems.length > 0 && !isMultiSelectMode && (
                  <Button
                    variant="outline"
                    className="w-full py-2 mb-2 bg-[#0a101f] border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9] justify-center"
                    onClick={() => pasteSelectedItems(path)}
                  >
                    <ClipboardPaste size={14} className="mr-2" /> Paste {copiedItems.length} Items
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full py-2 bg-[#0a101f] border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9] justify-center"
                  onClick={() => openItemSelectorForContainer(path)}
                >
                  <Plus size={14} className="mr-2" /> Add Item
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render the new item selector
  const renderItemSelector = () => {
    if (!isItemSelectorOpen) return null

    const targetName = itemSelectionTarget?.type === "slot" ? itemSelectionTarget.target : "container"

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => {
            setIsItemSelectorOpen(false)
            setItemSelectionTarget(null)
          }}
        />
        <div className="relative bg-[#050510] border border-[#2a3a5a] rounded-md w-full max-w-xl max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-[#2a3a5a] flex justify-between items-center">
            <h3 className="text-[#c3d0e9] font-medium">Select Item for {targetName}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#8a9cc2] hover:text-[#c3d0e9] hover:bg-[#1a2a40]"
              onClick={() => {
                setIsItemSelectorOpen(false)
                setItemSelectionTarget(null)
              }}
            >
              <X size={18} />
            </Button>
          </div>

          <div className="p-4 border-b border-[#2a3a5a]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8a9cc2]" size={16} />
              <Input
                placeholder="Search items..."
                className="pl-10 bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                className={
                  selectedCategory === "all"
                    ? "bg-[#6b46c1] hover:bg-[#805ad5] text-white"
                    : "bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                }
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Button>

              {itemCategories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  className={
                    selectedCategory === category
                      ? "bg-[#6b46c1] hover:bg-[#805ad5] text-white"
                      : "bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                  }
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-grow">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-md hover:bg-[#1a2a40] text-left transition-colors"
                  onClick={() => handleItemSelection(item.id)}
                >
                  <div className="flex-1">
                    <div className="text-[#c3d0e9] font-medium">{item.name}</div>
                    <div className="text-xs text-[#8a9cc2] mt-1">{item.id}</div>
                    {item.description && (
                      <div className="text-xs text-[#8a9cc2] mt-1 line-clamp-2">{item.description}</div>
                    )}
                  </div>
                  {isContainer(item.id) && (
                    <Badge variant="outline" className="bg-[#1a2a40] text-[#8a9cc2] border-[#2a3a5a]">
                      Container
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  // Render slot with copy/paste functionality
  const renderSlot = (slot: keyof EquipmentLoadout, title: string) => {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-[#a3b3d2]">{title}</h3>
          {copiedItem && !loadout[slot] && !isMultiSelectMode && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
              onClick={() => pasteItem(slot)}
            >
              <ClipboardPaste size={14} className="mr-1" /> Paste
            </Button>
          )}
        </div>
        <div className="relative">
          {loadout[slot] ? (
            renderItem(loadout[slot]!, slot)
          ) : (
            <Button
              variant="outline"
              className="w-full py-6 bg-[#0a101f] border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9] justify-center"
              onClick={() => openItemSelectorForSlot(slot)}
            >
              <Plus size={16} className="mr-2" /> Add Item
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <div className="container mx-auto p-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-1 text-[#b794f4]">Animal Company Block Builder</h1>
          <p className="text-[#8a9cc2]">Made by lacksom</p>
        </div>

        <div className="flex justify-between mb-4">
          <Dialog open={isUpdateLogOpen} onOpenChange={setIsUpdateLogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
              >
                <History size={16} className="mr-2" /> Update Log
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#b794f4]">Update Log</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] rounded border border-[#2a3a5a] p-2">
                {updateLog.length > 0 ? (
                  <div className="space-y-1">
                    {updateLog.map((log, index) => (
                      <div key={index} className="text-sm text-[#a3b3d2]">
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#8a9cc2]/70 text-sm italic p-2">
                    No updates yet. Actions will be logged here.
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <div className="flex gap-2">
            {isMultiSelectMode ? (
              <>
                <div className="bg-[#1a2a40] text-[#c3d0e9] px-3 py-1 rounded-md flex items-center">
                  <span>{selectedItems.size} items selected</span>
                </div>
                <Button
                  variant="outline"
                  className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                  onClick={copySelectedItems}
                  disabled={selectedItems.size === 0}
                >
                  <Clipboard size={16} className="mr-2" /> Copy Selected
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                  onClick={() => {
                    setIsMultiSelectMode(false)
                    setSelectedItems(new Set())
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {copiedItem && (
                  <div className="bg-[#1a2a40] text-[#c3d0e9] px-3 py-1 rounded-md flex items-center">
                    <Clipboard size={14} className="mr-2" />
                    <span>Item copied</span>
                  </div>
                )}
                {copiedItems.length > 0 && (
                  <div className="bg-[#1a2a40] text-[#c3d0e9] px-3 py-1 rounded-md flex items-center">
                    <Clipboard size={14} className="mr-2" />
                    <span>{copiedItems.length} items copied</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                  onClick={() => setIsMultiSelectMode(true)}
                >
                  <Check size={16} className="mr-2" /> Multi-Select
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                  onClick={randomizeAll}
                >
                  <RefreshCw size={16} className="mr-2" /> Randomize All
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="bg-[#0a101f] border-b border-[#2a3a5a] w-full justify-start rounded-none mb-4">
            <TabsTrigger
              value="builder"
              className="data-[state=active]:bg-[#1a2a40] data-[state=active]:text-[#c3d0e9] text-[#8a9cc2]"
            >
              Builder
            </TabsTrigger>
            <TabsTrigger
              value="output"
              className="data-[state=active]:bg-[#1a2a40] data-[state=active]:text-[#c3d0e9] text-[#8a9cc2]"
            >
              Output
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-0">
            <div className="bg-[#0a101f] rounded-lg p-6 border border-[#2a3a5a]">
              <h2 className="text-xl font-semibold mb-4 text-[#b794f4]">Equipment Loadout</h2>
              <p className="text-[#8a9cc2] mb-6 text-sm">Add items to different body positions</p>

              <div className="space-y-6">
                {/* Back Slot */}
                {renderSlot("back", "Back")}

                {/* Left Hand Slot */}
                {renderSlot("leftHand", "Left Hand")}

                {/* Right Hand Slot */}
                {renderSlot("rightHand", "Right Hand")}

                {/* Left Hip Slot */}
                {renderSlot("leftHip", "Left Hip")}

                {/* Right Hip Slot */}
                {renderSlot("rightHip", "Right Hip")}

                <div className="pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                    onClick={resetLoadout}
                  >
                    Reset
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                    onClick={() => setIsBypassDialogOpen(true)}
                  >
                    <Settings size={16} className="mr-2" /> Bypass Builder
                  </Button>

                  <input id="upload-json" type="file" accept=".json" className="hidden" onChange={handleUploadJson} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="output" className="mt-0">
            <div className="bg-[#0a101f] rounded-lg p-6 border border-[#2a3a5a]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#b794f4]">JSON Output</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                    onClick={() => downloadJson(false)}
                  >
                    <Download size={16} className="mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                    onClick={() => downloadJson(true)}
                  >
                    Shrink JSON
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                    onClick={() => document.getElementById("upload-json")?.click()}
                  >
                    <Upload size={16} className="mr-1" />
                    Upload JSON
                  </Button>
                </div>
              </div>

              <Textarea
                value={outputJson}
                readOnly
                className="h-[calc(100vh-300px)] font-mono text-sm bg-[#050510] border-[#2a3a5a] text-[#a3b3d2]"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9]">
          <DialogHeader>
            <DialogTitle className="text-[#b794f4]">Edit Item</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemID" className="text-[#a3b3d2]">
                  Item
                </Label>
                <div className="text-[#c3d0e9] font-medium">
                  {getItemDetails(editingItem.item.itemID)?.name || editingItem.item.itemID}
                </div>
                <div className="text-[#8a9cc2] text-sm">{editingItem.item.itemID}</div>
              </div>

              {/* Color Controls */}
              <div className="space-y-2">
                <Label className="text-[#a3b3d2]">Color</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="colorHue" className="text-sm text-[#a3b3d2]">
                      Hue: {editingItem.item.colorHue ?? 0}
                    </Label>
                    <Slider
                      id="colorHue"
                      min={0}
                      max={210}
                      step={1}
                      value={[editingItem.item.colorHue ?? 0]}
                      onValueChange={(value) =>
                        setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, colorHue: value[0] },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="colorSaturation" className="text-sm text-[#a3b3d2]">
                      Saturation: {editingItem.item.colorSaturation ?? 0}
                    </Label>
                    <Slider
                      id="colorSaturation"
                      min={0}
                      max={120}
                      step={1}
                      value={[editingItem.item.colorSaturation ?? 0]}
                      onValueChange={(value) =>
                        setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, colorSaturation: value[0] },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div
                  className="h-10 rounded-md mt-2"
                  style={{
                    background: `hsl(${editingItem.item.colorHue ?? 0}, ${editingItem.item.colorSaturation ?? 0}%, 50%)`,
                  }}
                />
              </div>

              {/* Size Control */}
              <div>
                <Label htmlFor="scaleModifier" className="text-[#a3b3d2]">
                  Size: {editingItem.item.scaleModifier ?? 0}
                </Label>
                <Slider
                  id="scaleModifier"
                  min={-128}
                  max={127}
                  step={1}
                  value={[editingItem.item.scaleModifier ?? 0]}
                  onValueChange={(value) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, scaleModifier: value[0] },
                    })
                  }
                  className="mt-1"
                />
              </div>

              {/* Ammo Control (for weapons) */}
              {editingItem.item.itemID.includes("gun") ||
              editingItem.item.itemID.includes("shotgun") ||
              editingItem.item.itemID.includes("rifle") ||
              editingItem.item.itemID.includes("revolver") ||
              editingItem.item.itemID.includes("flaregun") ||
              editingItem.item.itemID.includes("crossbow") ||
              editingItem.item.itemID.includes("rpg") ? (
                <div>
                  <Label htmlFor="ammo" className="text-[#a3b3d2]">
                    Ammo
                  </Label>
                  <Input
                    id="ammo"
                    type="number"
                    min={0}
                    value={editingItem.item.ammo ?? 0}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, ammo: Number.parseInt(e.target.value) || 0 },
                      })
                    }
                    className="bg-[#050510] border-[#2a3a5a] text-[#c3d0e9]"
                  />
                </div>
              ) : null}

              {/* State Control (for shredder) */}
              {editingItem.item.itemID.includes("shredder") ? (
                <div>
                  <Label htmlFor="state" className="text-[#a3b3d2]">
                    State: {editingItem.item.state ?? 0}
                  </Label>
                  <Slider
                    id="state"
                    min={0}
                    max={8000}
                    step={100}
                    value={[editingItem.item.state ?? 0]}
                    onValueChange={(value) =>
                      setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, state: value[0] },
                      })
                    }
                    className="mt-1"
                  />
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                >
                  Cancel
                </Button>
                <Button onClick={saveEditedItem} className="bg-[#6b46c1] hover:bg-[#805ad5] text-white">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bypass Builder Dialog */}
      <Dialog open={isBypassDialogOpen} onOpenChange={setIsBypassDialogOpen}>
        <DialogContent className="bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#b794f4]">Bypass Builder</DialogTitle>
            <DialogDescription className="text-[#8a9cc2]">
              Select items to add to your bypass structure. The system will automatically create nested containers as
              needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col md:flex-row gap-4 flex-grow overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[#a3b3d2] font-medium">Select Items</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#8a9cc2]">
                          <Info size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#1a2a40] border-[#2a3a5a] text-[#c3d0e9] max-w-xs">
                        <p>
                          Items will be automatically organized in nested containers:
                          <br />
                          1. Heart Gun → Large Backpack → up to 22 items
                          <br />
                          2. If more items, adds Heart Gun → Large Backpack → items
                          <br />
                          3. Process repeats for unlimited items
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8a9cc2]" size={16} />
                  <Input
                    placeholder="Search items..."
                    className="pl-10 bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9]"
                    value={bypassItemsSearch}
                    onChange={(e) => setBypassItemsSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={bypassSelectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    className={
                      bypassSelectedCategory === "all"
                        ? "bg-[#6b46c1] hover:bg-[#805ad5] text-white"
                        : "bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                    }
                    onClick={() => setBypassSelectedCategory("all")}
                  >
                    All
                  </Button>

                  {itemCategories.map((category) => (
                    <Button
                      key={category}
                      variant={bypassSelectedCategory === category ? "default" : "outline"}
                      size="sm"
                      className={
                        bypassSelectedCategory === category
                          ? "bg-[#6b46c1] hover:bg-[#805ad5] text-white"
                          : "bg-transparent border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
                      }
                      onClick={() => setBypassSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-containers"
                    checked={bypassShowContainers}
                    onCheckedChange={(checked) => setBypassShowContainers(checked as boolean)}
                    className="border-[#2a3a5a] data-[state=checked]:bg-[#b794f4] data-[state=checked]:text-white"
                  />
                  <Label htmlFor="show-containers" className="text-[#c3d0e9]">
                    Show containers (backpacks, heart guns, etc.)
                  </Label>
                </div>
              </div>

              <ScrollArea className="flex-grow border border-[#2a3a5a] rounded-md">
                <div className="p-2">
                  {filteredBypassItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {filteredBypassItems.map((item) => {
                        const isSelected = bypassSelectedItems.includes(item.id)
                        const quantity = bypassItemQuantities[item.id] || 1
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center p-2 rounded-md ${
                              isSelected ? "bg-[#1a2a40]" : "hover:bg-[#0f1525]"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleBypassItemSelection(item.id)}
                              className="mr-3 data-[state=checked]:bg-[#b794f4] data-[state=checked]:text-white"
                            />
                            <div className="flex-1" onClick={() => toggleBypassItemSelection(item.id)}>
                              <div className="text-[#c3d0e9] font-medium">{item.name}</div>
                              <div className="text-xs text-[#8a9cc2]">{item.id}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <div className="flex items-center bg-[#0a101f] border border-[#2a3a5a] rounded-md overflow-hidden">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-none border-r border-[#2a3a5a] text-[#8a9cc2]"
                                    onClick={() => updateBypassItemQuantity(item.id, quantity - 1)}
                                    disabled={quantity <= 1}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={quantity}
                                    onChange={(e) =>
                                      updateBypassItemQuantity(item.id, Number.parseInt(e.target.value) || 1)
                                    }
                                    className="w-12 h-7 text-center bg-transparent border-0 text-[#c3d0e9]"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-none border-l border-[#2a3a5a] text-[#8a9cc2]"
                                    onClick={() => updateBypassItemQuantity(item.id, quantity + 1)}
                                    disabled={quantity >= 100}
                                  >
                                    +
                                  </Button>
                                </div>
                              )}
                              <Badge variant="outline" className="bg-[#1a2a40] text-[#8a9cc2] border-[#2a3a5a]">
                                {isContainer(item.id) ? "Container" : item.category}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#8a9cc2]">
                      No items found. Try adjusting your search or category filter.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="w-full md:w-64 flex flex-col">
              <div className="space-y-4 mb-4">
                <Label className="text-[#a3b3d2] font-medium">Bypass Options</Label>

                <div className="space-y-2">
                  <Label htmlFor="bypass-slot" className="text-[#a3b3d2]">
                    Slot
                  </Label>
                  <Select value={bypassSlot} onValueChange={(value) => setBypassSlot(value as BypassSlotType)}>
                    <SelectTrigger className="bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9]">
                      <SelectValue placeholder="Select slot" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a101f] border-[#2a3a5a] text-[#c3d0e9]">
                      <SelectItem value="leftHand">Left Hand</SelectItem>
                      <SelectItem value="rightHand">Right Hand</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="leftHip">Left Hip</SelectItem>
                      <SelectItem value="rightHip">Right Hip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="randomize-items"
                    checked={bypassRandomizeItems}
                    onCheckedChange={(checked) => setBypassRandomizeItems(checked as boolean)}
                    className="border-[#2a3a5a] data-[state=checked]:bg-[#b794f4] data-[state=checked]:text-white"
                  />
                  <Label htmlFor="randomize-items" className="text-[#c3d0e9]">
                    Randomize colors and sizes
                  </Label>
                </div>
              </div>

              <div className="border border-[#2a3a5a] rounded-md p-3 flex-grow">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-[#a3b3d2] font-medium">Selected Items</Label>
                  <Badge variant="outline" className="bg-[#1a2a40] text-[#8a9cc2] border-[#2a3a5a]">
                    {bypassSelectedItems.reduce((total, itemID) => total + (bypassItemQuantities[itemID] || 1), 0)}
                  </Badge>
                </div>

                {bypassSelectedItems.length > 0 ? (
                  <ScrollArea className="h-[calc(100%-2.5rem)]">
                    <div className="space-y-1">
                      {bypassSelectedItems.map((itemID) => {
                        const item = getItemDetails(itemID)
                        const quantity = bypassItemQuantities[itemID] || 1
                        return (
                          <div
                            key={itemID}
                            className="flex items-center justify-between p-2 rounded-md bg-[#0f1525] text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[#c3d0e9] truncate">{item?.name || itemID}</span>
                              {quantity > 1 && (
                                <Badge variant="outline" className="bg-[#1a2a40] text-[#8a9cc2] border-[#2a3a5a]">
                                  x{quantity}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-[#8a9cc2] hover:text-red-400 hover:bg-[#2a1a20]"
                              onClick={() => toggleBypassItemSelection(itemID)}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-[#8a9cc2] text-sm">
                    No items selected. Click on items to add them to your bypass structure.
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="bg-[#1a1a2e] border border-[#2a3a5a] rounded-md p-3 flex items-start gap-2 mb-4">
                  <AlertTriangle size={18} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[#a3b3d2]">
                    <p className="font-medium text-yellow-400">Warning</p>
                    <p>Complex nested structures may cause game instability. Use at your own risk.</p>
                  </div>
                </div>

                <div className="text-sm text-[#8a9cc2] mb-2">
                  {bypassSelectedItems.length > 0
                    ? `Will create ${Math.ceil(
                        bypassSelectedItems.reduce((total, itemID) => total + (bypassItemQuantities[itemID] || 1), 0) /
                          22,
                      )} container(s) for ${bypassSelectedItems.reduce(
                        (total, itemID) => total + (bypassItemQuantities[itemID] || 1),
                        0,
                      )} items`
                    : "Select items to create a bypass structure"}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsBypassDialogOpen(false)
                setBypassSelectedItems([])
                setBypassItemQuantities({})
              }}
              className="border-[#2a3a5a] text-[#8a9cc2] hover:bg-[#1a2a40] hover:text-[#c3d0e9]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBypassPresetConfirm}
              className="bg-[#6b46c1] hover:bg-[#805ad5] text-white"
              disabled={bypassSelectedItems.length === 0}
            >
              Create Bypass Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Selector */}
      {renderItemSelector()}
    </div>
  )
}
