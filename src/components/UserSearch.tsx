import { useState } from "react";
import { Search, Loader2, User, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoodleUser } from "@/lib/moodle-api";
import { motion, AnimatePresence } from "framer-motion";

interface UserSearchProps {
  users: MoodleUser[];
  loading: boolean;
  onSearch: (term: string) => void;
  onSelectUser: (user: MoodleUser) => void;
  selectedUser: MoodleUser | null;
}

export function UserSearch({ users, loading, onSearch, onSelectUser, selectedUser }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTerm, setFilterTerm] = useState("");

  const handleSearch = () => {
    if (searchTerm.trim().length >= 2) {
      onSearch(searchTerm.trim());
      setFilterTerm("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Filter already-fetched results locally
  const filteredUsers = filterTerm
    ? users.filter((u) =>
        u.fullname.toLowerCase().includes(filterTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(filterTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(filterTerm.toLowerCase())
      )
    : users;

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Nunca";
    return new Date(timestamp * 1000).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search bar - triggers on Enter or button */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || searchTerm.trim().length < 2} className="h-10 sm:h-12 px-4 sm:px-6 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
      </div>

      {/* Local filter for results */}
      {users.length > 5 && (
        <Input
          placeholder="Filtrar resultados..."
          value={filterTerm}
          onChange={(e) => setFilterTerm(e.target.value)}
          className="h-10 text-sm"
        />
      )}

      <AnimatePresence>
        {filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-h-80 overflow-y-auto space-y-2 rounded-lg"
          >
            {filteredUsers.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                    selectedUser?.id === user.id ? "border-primary ring-1 ring-primary/30 glow-primary" : ""
                  }`}
                  onClick={() => onSelectUser(user)}
                >
                  <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      {user.profileimageurl ? (
                        <img src={user.profileimageurl} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate text-sm sm:text-base">{user.fullname}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDate(user.lastaccess)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground hidden sm:inline">@{user.username}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {users.length > 0 && filteredUsers.length === 0 && filterTerm && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No hay coincidencias para "{filterTerm}" en los resultados
        </p>
      )}

      {searchTerm.length >= 2 && !loading && users.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No se encontraron usuarios. Presioná Enter o el botón Buscar.
        </p>
      )}
    </div>
  );
}
