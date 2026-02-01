# 2. The Context Cloud Architecture

The biggest problem with hiring a new worker is **Context**. "Context" means all the small, unwritten rules a client has. For example: "I like blue, not green," or "I want my videos to be fast, not slow."

Usually, a worker learns these rules over many months. We call this "Institutional Memory." If the worker leaves, the memory is gone. This makes it very hard for a business to grow.

### 2.1 Moving Memory from Brains to Computers
In Nimmit, we treat memory as a digital asset. We store it in a **Vector Database** (like Pinecone). This is a smart computer brain that stays with the platform, not the person.

This is based on the academic concept of **Transactive Memory (Wegner, 1985)**. In nature, a group of people works better when they have a shared memory of "who knows what." Nimmit builds this "group brain" using technology.

- **Old Way**: The rules are in the worker's head. If they quit, you lose everything.
- **Nimmit Way**: The rules are in the **Context Cloud**. If a worker quits, a new one can start working in minutes because the computer already has the rules.

### 2.2 How "Context Injection" Works
When a client asks for a new task, the system automatically finds the rules from past work. This is called **Context Injection**. Before the human worker starts, the computer gives them:
- Styles from past successful work.
- Mistakes to avoid from past feedback.
- Specific rules for that client.

The worker doesn't have to guess. They have the "memory" of every job Nimmit has ever done for that client.

\newpage
